import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import TeamInvitation from "@/models/TeamInvitation";
import { verifyUserSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

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

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid invitation ID." },
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

    const { action } = (body || {}) as Record<string, unknown>;
    if (action !== "accept" && action !== "reject") {
      return NextResponse.json(
        { success: false, message: 'Action must be "accept" or "reject".' },
        { status: 400 }
      );
    }

    await connectDB();

    const invitation = await TeamInvitation.findById(id);
    if (!invitation) {
      return NextResponse.json(
        { success: false, message: "Invitation not found." },
        { status: 404 }
      );
    }

    // Verify caller is the intended invitee
    const isIntendedRecipient =
      invitation.inviteeEmail.trim().toLowerCase() === user.email.trim().toLowerCase() ||
      invitation.invitee?.toString() === user.userId;

    if (!isIntendedRecipient) {
      return NextResponse.json(
        { success: false, message: "You are not authorized to respond to this invitation." },
        { status: 403 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { success: false, message: `This invitation has already been ${invitation.status}.` },
        { status: 400 }
      );
    }

    // Check 14-day expiration window
    const EXPIRATION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
    const isExpired = Date.now() - new Date(invitation.createdAt).getTime() > EXPIRATION_WINDOW_MS;
    if (isExpired) {
      invitation.status = "canceled";
      await invitation.save();
      return NextResponse.json(
        { success: false, message: "This invitation has expired." },
        { status: 410 }
      );
    }

    const team = await Team.findById(invitation.team);
    if (!team) {
      invitation.status = "canceled";
      await invitation.save();
      return NextResponse.json(
        { success: false, message: "The team no longer exists." },
        { status: 404 }
      );
    }

    // Atomically transition the invitation status from "pending"
    const targetStatus = action === "accept" ? "accepted" : "rejected";
    const updatedInvitation = await TeamInvitation.findOneAndUpdate(
      { _id: id, status: "pending" },
      { $set: { status: targetStatus, invitee: user.userId } },
      { new: true }
    );

    if (!updatedInvitation) {
      return NextResponse.json(
        { success: false, message: "This invitation has already been updated or processed." },
        { status: 409 }
      );
    }

    if (action === "accept") {
      // Add user to team atomically and idempotently
      const userObjId = new mongoose.Types.ObjectId(user.userId);
      await Team.updateOne(
        {
          _id: team._id,
          "members.user": { $ne: userObjId },
        },
        {
          $push: {
            members: {
              user: userObjId,
              role: updatedInvitation.role || "member",
              joinedAt: new Date(),
            },
          },
        }
      );

      // Audit log
      await recordAuditLog(
        {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        "TEAM_INVITATION_ACCEPTED",
        "Team",
        team._id.toString(),
        { teamName: team.name }
      );

      // Notify team owner
      if (team.owner.toString() !== user.userId) {
        await createNotification({
          recipientId: team.owner,
          senderId: user.userId,
          type: "TEAM_JOINED",
          title: "New Team Member",
          message: `${user.name} accepted your invitation and joined team "${team.name}".`,
          link: "/?tab=team",
        });
      }

      return NextResponse.json({
        success: true,
        message: `You have joined team "${team.name}"!`,
        teamId: team._id.toString(),
      });
    } else {
      await recordAuditLog(
        {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        "TEAM_INVITATION_REJECTED",
        "Team",
        team._id.toString(),
        { teamName: team.name }
      );

      return NextResponse.json({
        success: true,
        message: "Invitation declined.",
      });
    }
  } catch (error) {
    console.error("Respond invitation error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to process invitation response." },
      { status: 500 }
    );
  }
}
