import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/mongodb";
import { verifyUserSession } from "@/lib/auth";
import User from "@/models/User";
import { recordAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100, "Name cannot exceed 100 characters."),
});

export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyUserSession(request);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
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

    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message || "Invalid name provided." },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedUser = await User.findByIdAndUpdate(
      user.userId,
      { $set: { name: parsed.data.name } },
      { returnDocument: "after", runValidators: true }
    ).select("name email role createdAt");

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    // Record server-side audit log
    await recordAuditLog(
      {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      "PROFILE_UPDATED",
      "User",
      updatedUser._id.toString(),
      { updatedField: "name", newName: updatedUser.name }
    );

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update profile." },
      { status: 500 }
    );
  }
}
