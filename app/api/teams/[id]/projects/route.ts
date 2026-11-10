import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import Project from "@/models/Project";
import { verifyUserSession, hasRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { user, error: authError } = await verifyUserSession(request);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    const { id: teamId } = await context.params;
    if (!mongoose.isValidObjectId(teamId)) {
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
        { success: false, message: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { projectId } = (body || {}) as Record<string, unknown>;
    if (typeof projectId !== "string" || !mongoose.isValidObjectId(projectId)) {
      return NextResponse.json(
        { success: false, message: "Valid project ID is required." },
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

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found." },
        { status: 404 }
      );
    }

    // Only the project creator (or platform admin) can associate their project with a team
    const isProjectCreator = project.createdBy.toString() === user.userId;
    const isTeamOwner = team.owner.toString() === user.userId;
    const isTeamMember = (team.members || []).some(
      (m: { user: { toString(): string } }) => m.user.toString() === user.userId
    );

    if (!isProjectCreator && !hasRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, message: "Only the project creator can associate this project with a team." },
        { status: 403 }
      );
    }

    if (!isTeamMember && !isTeamOwner && !hasRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, message: "You must be a member or owner of the team to associate projects with it." },
        { status: 403 }
      );
    }

    // Link project to team
    const pObjectId = new mongoose.Types.ObjectId(projectId);
    const alreadyLinked = (team.projects || []).some(
      (p: { toString(): string }) => p.toString() === projectId
    );

    if (!alreadyLinked) {
      team.projects.push(pObjectId);
      await team.save();
    }

    project.teamId = team._id;
    await project.save();

    await recordAuditLog(
      {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "PROJECT_LINKED_TO_TEAM",
      "Project",
      project._id.toString(),
      { teamId: team._id.toString(), teamName: team.name, projectTitle: project.title }
    );

    return NextResponse.json({
      success: true,
      message: `Project "${project.title}" linked to team "${team.name}".`,
    });
  } catch (error) {
    console.error("Link project to team error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to associate project with team." },
      { status: 500 }
    );
  }
}
