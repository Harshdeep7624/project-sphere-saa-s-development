import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Project from "@/models/Project";
import { verifyUserSession, hasRole } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; projectId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { user, error: authError } = await verifyUserSession(request);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    const { id: teamId, projectId } = await context.params;
    if (!mongoose.isValidObjectId(teamId) || !mongoose.isValidObjectId(projectId)) {
      return NextResponse.json(
        { success: false, message: "Invalid ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const [team, project] = await Promise.all([
      Team.findById(teamId),
      Project.findById(projectId),
    ]);

    if (!team) {
      return NextResponse.json(
        { success: false, message: "Team not found." },
        { status: 404 }
      );
    }

    if (project) {
      const isCreator = project.createdBy.toString() === user.userId;
      const isTeamOwner = team.owner.toString() === user.userId;

      if (!isCreator && !isTeamOwner && !hasRole(user, ["admin"])) {
        return NextResponse.json(
          { success: false, message: "Permission denied." },
          { status: 403 }
        );
      }

      project.teamId = null;
      await project.save();
    }

    team.projects = (team.projects || []).filter(
      (p: { toString(): string }) => p.toString() !== projectId
    ) as any;
    await team.save();

    return NextResponse.json({
      success: true,
      message: "Project unlinked from team.",
    });
  } catch (error) {
    console.error("Unlink project from team error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to remove project from team." },
      { status: 500 }
    );
  }
}
