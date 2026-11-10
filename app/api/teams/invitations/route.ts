import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import TeamInvitation from "@/models/TeamInvitation";
import "@/models/Team";
import "@/models/User";
import { verifyUserSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyUserSession(request);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    await connectDB();

    const invitations = await TeamInvitation.find({
      $or: [
        { inviteeEmail: user.email.toLowerCase() },
        { invitee: user.userId },
      ],
      status: "pending",
    })
      .populate("inviter", "name email")
      .populate("team", "name description")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = invitations.map((inv) => {
      const inviterObj = inv.inviter as unknown as { _id?: unknown; name?: string; email?: string } | null;
      const teamObj = inv.team as unknown as { _id?: unknown; name?: string; description?: string } | null;

      return {
        id: inv._id.toString(),
        teamId: teamObj?._id ? teamObj._id.toString() : inv.team?.toString(),
        teamName: teamObj?.name || inv.teamName,
        teamDescription: teamObj?.description || "",
        inviterName: inviterObj?.name || "A team manager",
        inviterEmail: inviterObj?.email || "",
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : null,
      };
    });

    return NextResponse.json({
      success: true,
      invitations: formatted,
    });
  } catch (error) {
    console.error("Fetch pending user invitations error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load invitations." },
      { status: 500 }
    );
  }
}
