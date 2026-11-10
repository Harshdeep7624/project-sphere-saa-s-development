import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyUserSession } from "@/lib/auth";
import Notification from "@/models/Notification";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyUserSession(request);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    await connectDB();

    await Notification.updateMany(
      { recipient: user.userId, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update notifications." },
      { status: 500 }
    );
  }
}
