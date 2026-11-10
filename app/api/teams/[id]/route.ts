import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Project from "@/models/Project";
import "@/models/User";
import { verifyUserSession, hasRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import TeamInvitation from "@/models/TeamInvitation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
        { success: false, message: "Invalid team ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const team = await Team.findById(id)
      .populate("owner", "name email role")
      .populate("members.user", "name email role")
      .populate("projects", "title category status deadline githubUrl")
      .lean();

    if (!team) {
      return NextResponse.json(
        { success: false, message: "Team not found." },
        { status: 404 }
      );
    }

    const isOwner = team.owner?._id?.toString() === user.userId;
    const isMember = (team.members || []).some(
      (m: { user?: unknown }) => {
        const u = m?.user as { _id?: { toString(): string } } | null | undefined;
        const uid = u?._id ? u._id.toString() : (m?.user ? String(m.user) : "");
        return uid === user.userId;
      }
    );

    if (!isOwner && !isMember && !hasRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to view this team." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      team,
    });
  } catch (error) {
    console.error("Get team error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve team details." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
        { success: false, message: "Invalid team ID." },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    const rawBody = (body || {}) as Record<string, unknown>;
    const allowedFields = ["name", "description"];
    const invalidFields = Object.keys(rawBody).filter((key) => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Unauthorized fields provided: ${invalidFields.join(", ")}. Only name and description can be updated.`,
        },
        { status: 400 }
      );
    }

    const { name, description } = rawBody;

    await connectDB();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json(
        { success: false, message: "Team not found." },
        { status: 404 }
      );
    }

    const isOwner = team.owner.toString() === user.userId;
    const userMember = (team.members || []).find(
      (m: { user: { toString(): string }; role?: string }) => m.user.toString() === user.userId
    );
    const isTeamAdmin = userMember && userMember.role === "admin";

    if (!isOwner && !isTeamAdmin && !hasRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, message: "Only team owners and managers can update team settings." },
        { status: 403 }
      );
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
        return NextResponse.json(
          { success: false, message: "Team name must be between 2 and 100 characters." },
          { status: 400 }
        );
      }
      team.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string" || description.trim().length > 500) {
        return NextResponse.json(
          { success: false, message: "Description cannot exceed 500 characters." },
          { status: 400 }
        );
      }
      team.description = description.trim();
    }

    await team.save();

    await recordAuditLog(
      {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "TEAM_UPDATED",
      "Team",
      team._id.toString(),
      { name: team.name }
    );

    return NextResponse.json({
      success: true,
      message: "Team updated successfully.",
      team: {
        id: team._id.toString(),
        name: team.name,
        description: team.description,
      },
    });
  } catch (error) {
    console.error("Update team error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update team." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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
        { success: false, message: "Invalid team ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json(
        { success: false, message: "Team not found." },
        { status: 404 }
      );
    }

    // Only the team owner or a platform admin can delete the team
    if (team.owner.toString() !== user.userId && !hasRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, message: "Only the team owner can delete this team." },
        { status: 403 }
      );
    }

    // Safely disassociate any projects linked to this team
    await Project.updateMany({ teamId: team._id }, { $set: { teamId: null } });

    // Cancel any pending invitations
    await TeamInvitation.deleteMany({ team: team._id });

    // Delete team
    await Team.findByIdAndDelete(team._id);

    await recordAuditLog(
      {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "TEAM_DELETED",
      "Team",
      id,
      { name: team.name }
    );

    return NextResponse.json({
      success: true,
      message: "Team deleted successfully.",
    });
  } catch (error) {
    console.error("Delete team error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to delete team." },
      { status: 500 }
    );
  }
}
