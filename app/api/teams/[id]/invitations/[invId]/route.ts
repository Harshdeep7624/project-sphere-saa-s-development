import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import TeamInvitation from "@/models/TeamInvitation";
import { verifyUserSession, hasRole } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; invId: string }>;
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

    const { id, invId } = await context.params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(invId)) {
      return NextResponse.json(
        { success: false, message: "Invalid ID." },
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

    const isOwner = team.owner.toString() === user.userId;
    const userMember = (team.members || []).find(
      (m: { user: { toString(): string }; role?: string }) => m.user.toString() === user.userId
    );
    const isTeamAdmin = userMember && userMember.role === "admin";

    if (!isOwner && !isTeamAdmin && !hasRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, message: "Permission denied." },
        { status: 403 }
      );
    }

    const invitation = await TeamInvitation.findOneAndDelete({
      _id: invId,
      team: id,
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, message: "Invitation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled.",
    });
  } catch (error) {
    console.error("Cancel invitation error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to cancel invitation." },
      { status: 500 }
    );
  }
}
