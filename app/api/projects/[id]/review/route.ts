import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { verifyUserSession, hasRole } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import "@/models/User";
import { recordAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Check authentication and account status
    const { user, error: authError } = await verifyUserSession(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    // 2. Only faculty and admins can review projects.
    if (!hasRole(user, ["faculty", "admin"])) {
      return NextResponse.json(
        {
          success: false,
          message: "Only faculty and admins can review projects.",
        },
        { status: 403 }
      );
    }

    // 3. Validate the project ID.
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID." },
        { status: 400 }
      );
    }

    // 4. Validate the requested decision.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    const bodyRecord = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    const decision = bodyRecord.decision;

    if (!decision || !["Approved", "Rejected"].includes(decision as string)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Decision must be either "Approved" or "Rejected".',
        },
        { status: 400 }
      );
    }

    const rawNotes = bodyRecord.reviewNotes ?? bodyRecord.notes;
    let reviewNotes = "";
    if (rawNotes !== undefined && rawNotes !== null) {
      if (typeof rawNotes !== "string") {
        return NextResponse.json(
          { success: false, message: "Review notes must be text." },
          { status: 400 }
        );
      }
      reviewNotes = rawNotes.trim();
      if (reviewNotes.length > 1000) {
        return NextResponse.json(
          {
            success: false,
            message: "Review notes cannot exceed 1000 characters.",
          },
          { status: 400 }
        );
      }
    }

    // 5. Connect to MongoDB.
    await connectDB();

    // 6. Find a pending project and update its status atomically.
    const project = await Project.findOneAndUpdate(
      {
        _id: id,
        status: "Pending",
      },
      {
        $set: {
          status: decision,
          reviewNotes,
          reviewedBy: user.userId,
          reviewedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate("reviewedBy", "name email")
      .lean();

    if (!project) {
      const existingProject = await Project.exists({ _id: id });

      if (!existingProject) {
        return NextResponse.json(
          { success: false, message: "Project not found." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "This project has already been reviewed or is not pending.",
        },
        { status: 409 }
      );
    }

    const reviewer =
      project.reviewedBy && typeof project.reviewedBy === "object" && "_id" in project.reviewedBy
        ? (project.reviewedBy as { _id?: unknown; name?: string; email?: string })
        : null;

    // Reliably record audit log and notify the project creator before returning response
    await recordAuditLog(
      {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "PROJECT_REVIEWED",
      "Project",
      project._id.toString(),
      {
        title: project.title,
        decision,
        reviewNotes: reviewNotes || "",
      }
    );

    if (project.createdBy) {
      await createNotification({
        recipientId: project.createdBy,
        senderId: user.userId,
        type: decision === "Approved" ? "PROJECT_APPROVED" : "PROJECT_REJECTED",
        title: `Project ${decision}`,
        message: `Your project "${project.title}" has been ${String(decision).toLowerCase()}${
          reviewNotes ? `: "${reviewNotes}"` : "."
        }`,
        link: "/?tab=projects",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Project ${String(decision).toLowerCase()} successfully!`,
      project: {
        id: project._id.toString(),
        title: project.title,
        status: project.status,
        reviewNotes: project.reviewNotes || "",
        reviewedBy: reviewer
          ? {
              id: reviewer._id ? String(reviewer._id) : "",
              name: reviewer.name || "",
              email: reviewer.email || "",
            }
          : null,
        reviewedAt: project.reviewedAt
          ? new Date(project.reviewedAt).toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error("Project review error:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong while reviewing the project." },
      { status: 500 }
    );
  }
}
