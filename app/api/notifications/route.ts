import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyUserSession } from "@/lib/auth";
import Notification from "@/models/Notification";

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

    const [unreadCount, notifications] = await Promise.all([
      Notification.countDocuments({
        recipient: user.userId,
        read: false,
      }),
      Notification.find({ recipient: user.userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
    ]);

    const formatted = notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link || "",
      read: n.read,
      createdAt: n.createdAt,
    }));

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: formatted,
    });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load notifications." },
      { status: 500 }
    );
  }
}
