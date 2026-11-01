import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getCurrentUser, hasRole } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Check authentication.
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
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

    const decision = (body as Record<string, unknown>)?.decision;

    if (!decision || !["Approved", "Rejected"].includes(decision as string)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Decision must be either "Approved" or "Rejected".',
        },
        { status: 400 }
      );
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
        $set: { status: decision },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).lean();

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

    return NextResponse.json({
      success: true,
      message: `Project ${String(decision).toLowerCase()} successfully!`,
      project: {
        id: project._id.toString(),
        title: project.title,
        status: project.status,
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
