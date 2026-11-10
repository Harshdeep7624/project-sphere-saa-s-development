import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getCurrentUser, verifyAdmin } from "@/lib/auth";
import User from "@/models/User";
import { recordAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Administrative privileges required." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid user ID." },
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

    const { isActive } = (body || {}) as Record<string, unknown>;
    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, message: 'Field "isActive" must be a boolean.' },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Strict Self-Deactivation Defense
    if (admin.userId === id && !isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Administrators cannot deactivate their own account.",
        },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    if (targetUser.isActive === isActive) {
      return NextResponse.json({
        success: true,
        message: `User is already ${isActive ? "active" : "deactivated"}.`,
        user: {
          id: targetUser._id.toString(),
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          isActive: targetUser.isActive !== false,
        },
      });
    }

    // 2. Concurrency-Safe Last-Active-Administrator Defense
    if (targetUser.role === "admin" && !isActive) {
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();

        const activeAdmins = await User.countDocuments({
          role: "admin",
          isActive: { $ne: false },
          _id: { $ne: targetUser._id },
        }).session(session);

        if (activeAdmins < 1) {
          await session.abortTransaction();
          return NextResponse.json(
            {
              success: false,
              message: "Cannot deactivate the last active administrator in the system.",
            },
            { status: 400 }
          );
        }

        targetUser.isActive = false;
        await targetUser.save({ session });
        await session.commitTransaction();
      } catch (txError) {
        if (session) {
          try {
            await session.abortTransaction();
          } catch {
            // Ignore abort error
          }
        }
        // Fallback for standalone/local instances without replica set transactions
        const activeAdmins = await User.countDocuments({
          role: "admin",
          isActive: { $ne: false },
          _id: { $ne: targetUser._id },
        });

        if (activeAdmins < 1) {
          return NextResponse.json(
            {
              success: false,
              message: "Cannot deactivate the last active administrator in the system.",
            },
            { status: 400 }
          );
        }

        targetUser.isActive = false;
        await targetUser.save();
      } finally {
        if (session) {
          try {
            await session.endSession();
          } catch {
            // Ignore session end error
          }
        }
      }
    } else {
      targetUser.isActive = isActive;
      await targetUser.save();
    }

    // Reliably record server-side audit log and notification before returning response
    await recordAuditLog(
      {
        id: admin.userId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      "USER_STATUS_CHANGED",
      "User",
      targetUser._id.toString(),
      {
        userName: targetUser.name,
        userEmail: targetUser.email,
        newActiveState: isActive,
      }
    );

    await createNotification({
      recipientId: targetUser._id,
      senderId: admin.userId,
      type: "SYSTEM",
      title: isActive ? "Account Reactivated" : "Account Suspended",
      message: isActive
        ? "Your account access has been restored by an administrator."
        : "Your account has been deactivated by an administrator.",
      link: "/",
    });

    return NextResponse.json({
      success: true,
      message: `User "${targetUser.name}" has been ${isActive ? "activated" : "deactivated"} successfully.`,
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    console.error("User status update error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update account status." },
      { status: 500 }
    );
  }
}
