import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import "@/models/User";
import "@/models/Team";
import { verifyUserSession, hasRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedCategories = [
  "Web Development",
  "AI/ML",
  "Data Science",
  "Mobile App",
  "Other",
];

function errorResponse(error: unknown) {
  console.error("Project operation error:", error);

  return NextResponse.json(
    {
      success: false,
      message: "Unable to process the project request.",
    },
    { status: 500 }
  );
}

// GET SINGLE PROJECT
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { user, error: authError } = await verifyUserSession(request);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const project = await Project.findById(id)
      .populate("createdBy", "name email")
      .populate("reviewedBy", "name email")
      .populate("teamId", "name members owner")
      .lean();

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found." },
        { status: 404 }
      );
    }

    const ownerObj = project.createdBy as unknown as { _id?: unknown; name?: string; email?: string } | null;
    const isCreator = ownerObj?._id?.toString() === user.userId || project.createdBy?.toString() === user.userId;

    const teamObj = project.teamId as unknown as {
      owner?: unknown;
      members?: Array<{ user?: unknown }>;
    } | null;

    const isTeamOwner = teamObj?.owner
      ? typeof teamObj.owner === "object" && teamObj.owner !== null && "_id" in teamObj.owner
        ? (teamObj.owner as { _id: { toString(): string } })._id.toString() === user.userId
        : teamObj.owner.toString() === user.userId
      : false;

    const isTeamMember = teamObj?.members
      ? teamObj.members.some((m) => {
          const mUserId = m.user as unknown as { _id?: unknown } | string;
          return typeof mUserId === "object" && mUserId !== null && "_id" in mUserId
            ? mUserId._id?.toString() === user.userId
            : mUserId?.toString() === user.userId;
        })
      : false;

    if (!isCreator && !isTeamMember && !isTeamOwner && !hasRole(user, ["faculty", "admin"])) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view this project." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// UPDATE PROJECT
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { user, error: authError } = await verifyUserSession(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    await connectDB();

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const allowedFields = [
      "title",
      "description",
      "category",
      "deadline",
      "githubUrl",
      "teamId",
    ];

    const suppliedFields = Object.keys(body);

    if (
      suppliedFields.length === 0 ||
      suppliedFields.some((field) => !allowedFields.includes(field))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide valid project fields to update.",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if ("title" in body) {
      if (
        typeof body.title !== "string" ||
        body.title.trim().length < 3 ||
        body.title.trim().length > 100
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Title must be between 3 and 100 characters.",
          },
          { status: 400 }
        );
      }

      updates.title = body.title.trim();
    }

    if ("description" in body) {
      if (
        typeof body.description !== "string" ||
        body.description.trim().length < 1 ||
        body.description.trim().length > 2000
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Description must be between 1 and 2000 characters.",
          },
          { status: 400 }
        );
      }

      updates.description = body.description.trim();
    }

    if ("category" in body) {
      if (
        typeof body.category !== "string" ||
        !allowedCategories.includes(body.category)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select a valid project category.",
          },
          { status: 400 }
        );
      }

      updates.category = body.category;
    }

    if ("deadline" in body) {
      if (
        typeof body.deadline !== "string" ||
        !body.deadline.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Please provide a valid deadline.",
          },
          { status: 400 }
        );
      }

      const deadline = new Date(body.deadline);

      if (Number.isNaN(deadline.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: "Please provide a valid deadline.",
          },
          { status: 400 }
        );
      }

      updates.deadline = deadline;
    }

    if ("githubUrl" in body) {
      if (typeof body.githubUrl !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "GitHub URL must be text.",
          },
          { status: 400 }
        );
      }

      const githubUrl = body.githubUrl.trim();

      if (
        githubUrl.length > 300 ||
        (githubUrl !== "" &&
          !/^https:\/\/github\.com\/[^\s]+$/i.test(githubUrl))
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Enter a valid GitHub repository URL.",
          },
          { status: 400 }
        );
      }

      updates.githubUrl = githubUrl;
    }

    if ("teamId" in body) {
      if (body.teamId === null || body.teamId === "") {
        updates.teamId = null;
      } else if (typeof body.teamId === "string") {
        if (!mongoose.isValidObjectId(body.teamId)) {
          return NextResponse.json(
            { success: false, message: "Invalid team ID." },
            { status: 400 }
          );
        }
        const TeamModel = mongoose.models.Team;
        const team = TeamModel ? await TeamModel.findById(body.teamId) : null;
        if (!team) {
          return NextResponse.json(
            { success: false, message: "Team not found." },
            { status: 404 }
          );
        }
        const isTeamMember =
          team.owner.toString() === user.userId ||
          (team.members || []).some(
            (m: { user: { toString(): string } }) => m.user.toString() === user.userId
          );
        if (!isTeamMember && !hasRole(user, ["admin"])) {
          return NextResponse.json(
            { success: false, message: "You are not a member of this team." },
            { status: 403 }
          );
        }
        updates.teamId = team._id;
        const pOid = new mongoose.Types.ObjectId(id);
        if (!(team.projects || []).some((p: { toString(): string }) => p.toString() === id)) {
          team.projects.push(pOid);
          await team.save();
        }
      } else {
        return NextResponse.json(
          { success: false, message: "teamId must be a string or null." },
          { status: 400 }
        );
      }
    }

    // Ownership enforced by matching both _id and createdBy
    const project = await Project.findOneAndUpdate(
      { _id: id, createdBy: user.userId },
      { $set: updates },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).select(
      "title description category status deadline githubUrl createdAt reviewNotes reviewedBy reviewedAt teamId"
    ).populate("reviewedBy", "name").populate("teamId", "name");

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found or you do not have permission to edit it.",
        },
        { status: 404 }
      );
    }

    // Reliably record server-side audit log before returning response
    await recordAuditLog(
      {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "PROJECT_UPDATED",
      "Project",
      project._id.toString(),
      { updatedFields: Object.keys(updates) }
    );

    return NextResponse.json({
      success: true,
      message: "Project updated successfully.",
      project,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    return errorResponse(error);
  }
}

// DELETE PROJECT
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { user, error: authError } = await verifyUserSession(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    await connectDB();

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID." },
        { status: 400 }
      );
    }

    // Ownership enforced by matching both _id and createdBy
    const project = await Project.findOneAndDelete({
      _id: id,
      createdBy: user.userId,
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found or you do not have permission to delete it.",
        },
        { status: 404 }
      );
    }

    // Clean up project reference from any teams
    const TeamModel = mongoose.models.Team;
    if (TeamModel) {
      await TeamModel.updateMany(
        { projects: project._id },
        { $pull: { projects: project._id } }
      );
    }

    // Reliably record server-side audit log before returning response
    await recordAuditLog(
      {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "PROJECT_DELETED",
      "Project",
      project._id.toString(),
      { title: project.title }
    );

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully.",
      id: project._id.toString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
