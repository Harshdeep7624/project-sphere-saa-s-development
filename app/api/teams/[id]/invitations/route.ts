import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import User from "@/models/User";
import TeamInvitation from "@/models/TeamInvitation";
import { verifyUserSession, hasRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

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

    const team = await Team.findById(id).lean();
    if (!team) {
      return NextResponse.json(
        { success: false, message: "Team not found." },
        { status: 404 }
      );
    }

    const isMember =
      team.owner.toString() === user.userId ||
      (team.members || []).some((m: { user: { toString(): string } }) => m.user.toString() === user.userId);

    if (!isMember && !hasRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 }
      );
    }

    const invitations = await TeamInvitation.find({
      team: id,
      status: "pending",
    })
      .populate("inviter", "name email")
      .populate("invitee", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      invitations: invitations.map((inv) => ({
        id: inv._id.toString(),
        teamId: inv.team.toString(),
        teamName: inv.teamName,
        inviteeEmail: inv.inviteeEmail,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
      })),
    });
  } catch (error) {
    console.error("Fetch team invitations error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load invitations." },
      { status: 500 }
    );
  }
}

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

    const { email, role = "member" } = (body || {}) as Record<string, unknown>;

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, message: "Recipient email is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const invitationRole = role === "admin" ? "admin" : "member";

    await connectDB();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json(
        { success: false, message: "Team not found." },
        { status: 404 }
      );
    }

    const isOwner = team.owner.toString() === user.userId;
    const callerMember = (team.members || []).find(
      (m: { user: { toString(): string }; role?: string }) => m.user.toString() === user.userId
    );
    const isCallerAdmin = callerMember && callerMember.role === "admin";

    if (!isOwner && !isCallerAdmin && !hasRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, message: "Only team owners and managers can send invitations." },
        { status: 403 }
      );
    }

    // Team managers cannot promote others to Manager/admin; only team owner or platform admin can
    if (invitationRole === "admin" && !isOwner && !hasRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, message: "Only the team owner can invite members with Manager role." },
        { status: 403 }
      );
    }

    // Cannot invite oneself
    if (normalizedEmail === user.email.trim().toLowerCase()) {
      return NextResponse.json(
        { success: false, message: "You cannot send an invitation to yourself." },
        { status: 400 }
      );
    }

    // Check if invitee is already in the team or is the owner
    const existingTargetUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingTargetUser) {
      if (team.owner.toString() === existingTargetUser._id.toString()) {
        return NextResponse.json(
          { success: false, message: "The team owner is already part of the team." },
          { status: 409 }
        );
      }

      const alreadyMember = (team.members || []).some(
        (m: { user: { toString(): string } }) => m.user.toString() === existingTargetUser._id.toString()
      );
      if (alreadyMember) {
        return NextResponse.json(
          { success: false, message: "This user is already a member of this team." },
          { status: 409 }
        );
      }
    }

    // Prevent duplicate pending invitations for the same email to the same team
    const duplicatePending = await TeamInvitation.findOne({
      team: team._id,
      inviteeEmail: normalizedEmail,
      status: "pending",
    });

    if (duplicatePending) {
      return NextResponse.json(
        { success: false, message: "A pending invitation has already been sent to this email." },
        { status: 409 }
      );
    }

    // Create invitation
    const invitation = await TeamInvitation.create({
      team: team._id,
      teamName: team.name,
      inviter: user.userId,
      inviteeEmail: normalizedEmail,
      invitee: existingTargetUser ? existingTargetUser._id : null,
      role: invitationRole,
      status: "pending",
    });

    // Audit log
    await recordAuditLog(
      {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "TEAM_INVITATION_SENT",
      "TeamInvitation",
      invitation._id.toString(),
      { teamName: team.name, inviteeEmail: normalizedEmail, role: invitationRole }
    );

    // If invitee has an account, dispatch in-app notification (prevent duplicate notification)
    if (existingTargetUser) {
      const NotificationModel = mongoose.models.Notification;
      let alreadyNotified = false;
      if (NotificationModel) {
        const existingNotif = await NotificationModel.findOne({
          recipient: existingTargetUser._id,
          type: "TEAM_INVITATION",
          link: "/?tab=team",
          read: false,
        }).lean();
        if (existingNotif) {
          alreadyNotified = true;
        }
      }

      if (!alreadyNotified) {
        await createNotification({
          recipientId: existingTargetUser._id,
          senderId: user.userId,
          type: "TEAM_INVITATION",
          title: "Team Invitation",
          message: `${user.name} invited you to join team "${team.name}".`,
          link: "/?tab=team",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Invitation sent to ${normalizedEmail} successfully!`,
        invitation: {
          id: invitation._id.toString(),
          teamId: team._id.toString(),
          teamName: team.name,
          inviteeEmail: normalizedEmail,
          role: invitation.role,
          status: invitation.status,
          createdAt: invitation.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { success: false, message: "A pending invitation has already been sent to this email." },
        { status: 409 }
      );
    }
    console.error("Create team invitation error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to send team invitation." },
      { status: 500 }
    );
  }
}
