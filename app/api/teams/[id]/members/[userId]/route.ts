import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import { verifyUserSession, hasRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; userId: string }>;
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

    const { id, userId: targetUserId } = await context.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(targetUserId)) {
      return NextResponse.json(
        { success: false, message: "Invalid team or user ID." },
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

    const isSelf = targetUserId === user.userId;
    const isOwner = team.owner.toString() === user.userId;
    const callerMember = (team.members || []).find(
      (m: { user: { toString(): string }; role?: string }) => m.user.toString() === user.userId
    );
    const isCallerAdmin = callerMember && callerMember.role === "admin";

    // Check if target member exists in the team
    const targetMember = (team.members || []).find(
      (m: { user: { toString(): string }; role?: string }) => m.user.toString() === targetUserId
    );

    if (!targetMember) {
      return NextResponse.json(
        { success: false, message: "User is not a member of this team." },
        { status: 404 }
      );
    }

    // 1. If self-leaving
    if (isSelf) {
      if (isOwner) {
        return NextResponse.json(
          {
            success: false,
            message: "Team owners cannot leave their team. You can delete the team or transfer ownership.",
          },
          { status: 400 }
        );
      }
    } else {
      // 2. Removing another member: must be owner, team admin, or platform admin
      if (!isOwner && !isCallerAdmin && !hasRole(user, ["admin"])) {
        return NextResponse.json(
          { success: false, message: "Only team owners and managers can remove members." },
          { status: 403 }
        );
      }

      // Cannot remove the owner
      if (team.owner.toString() === targetUserId) {
        return NextResponse.json(
          { success: false, message: "The team owner cannot be removed." },
          { status: 400 }
        );
      }

      // Managers cannot remove other managers; only team owner or platform admin can
      if (targetMember.role === "admin" && !isOwner && !hasRole(user, ["admin"])) {
        return NextResponse.json(
          { success: false, message: "Only team owners or administrators can remove team managers." },
          { status: 403 }
        );
      }
    }

    // Remove member from team
    team.members = (team.members || []).filter(
      (m: { user: { toString(): string } }) => m.user.toString() !== targetUserId
    ) as any;
    await team.save();

    // Audit log
    await recordAuditLog(
      {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      isSelf ? "TEAM_MEMBER_LEFT" : "TEAM_MEMBER_REMOVED",
      "Team",
      team._id.toString(),
      { targetUserId, teamName: team.name }
    );

    // Notify the removed member if removed by someone else
    if (!isSelf) {
      await createNotification({
        recipientId: targetUserId,
        senderId: user.userId,
        type: "SYSTEM",
        title: "Team Membership Updated",
        message: `You were removed from team "${team.name}" by ${user.name}.`,
        link: "/?tab=team",
      });
    }

    return NextResponse.json({
      success: true,
      message: isSelf
        ? `You have left "${team.name}".`
        : "Team member removed successfully.",
    });
  } catch (error) {
    console.error("Remove team member error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to process membership change." },
      { status: 500 }
    );
  }
}
