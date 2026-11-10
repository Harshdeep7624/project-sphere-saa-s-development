import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { verifyUserSession } from "@/lib/auth";
import Notification from "@/models/Notification";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid notification ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipient: user.userId },
      { $set: { read: true } },
      { returnDocument: "after" }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Notification not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update notification." },
      { status: 500 }
    );
  }
}
