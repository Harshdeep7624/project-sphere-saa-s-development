import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getCurrentUser, verifyAdmin, type UserRole } from "@/lib/auth";
import User from "@/models/User";
import { recordAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/admin/users/[id]/role
 * Updates a user's role with full database-level security:
 * 1. Requires active database administrator privileges (verifyAdmin).
 * 2. Validates MongoDB ObjectId format.
 * 3. Enforces that role is one of "student" | "faculty" | "admin".
 * 4. Prevents self-demotion (an admin cannot remove their own admin privileges).
 * 5. Prevents demoting the final administrator in the database using a concurrency-safe atomic check.
 * 6. Never exposes password hashes.
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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
        { success: false, message: "Invalid user ID format." },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request JSON body." },
        { status: 400 }
      );
    }

    const newRole = (body as Record<string, unknown>)?.role;

    if (
      typeof newRole !== "string" ||
      !["student", "faculty", "admin"].includes(newRole)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid role. Must be "student", "faculty", or "admin".',
        },
        { status: 400 }
      );
    }

    // 1. Strict Self-Demotion Defense
    if (admin.userId === id && newRole !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Administrators cannot demote their own account to prevent accidental lockout.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "Target user not found." },
        { status: 404 }
      );
    }

    const oldRole = targetUser.role;

    // If role is unchanged, return gracefully
    if (targetUser.role === newRole) {
      return NextResponse.json({
        success: true,
        message: `User already possesses the "${newRole}" role.`,
        user: {
          id: targetUser._id.toString(),
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
        },
      });
    }

    const recordChange = async (oldR: string) => {
      try {
        await recordAuditLog(
          {
            id: admin.userId,
            name: admin.name,
            email: admin.email,
            role: admin.role,
          },
          "USER_ROLE_CHANGED",
          "User",
          targetUser._id.toString(),
          {
            userName: targetUser.name,
            userEmail: targetUser.email,
            oldRole: oldR,
            newRole,
          }
        );

        await createNotification({
          recipientId: targetUser._id,
          senderId: admin.userId,
          type: "ROLE_UPDATED",
          title: "Account Role Updated",
          message: `An administrator updated your account role from "${oldR}" to "${newRole}".`,
          link: "/",
        });
      } catch (err) {
        console.error("Post-role change notification error:", err);
      }
    };

    // 2. Concurrency-Safe Last-Administrator Defense
    // If demoting an existing administrator to non-admin, verify other admins exist
    if (targetUser.role === "admin" && newRole !== "admin") {
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();

        // Count other administrators within the transaction to prevent concurrent race condition
        const otherAdmins = await User.countDocuments({
          role: "admin",
          _id: { $ne: targetUser._id },
        }).session(session);

        if (otherAdmins < 1) {
          await session.abortTransaction();
          return NextResponse.json(
            {
              success: false,
              message: "Cannot demote the last remaining administrator in the system.",
            },
            { status: 400 }
          );
        }

        targetUser.role = newRole as UserRole;
        await targetUser.save({ session });
        await session.commitTransaction();
        await recordChange(oldRole);

        return NextResponse.json({
          success: true,
          message: `User "${targetUser.name}" role updated to "${newRole}" successfully.`,
          user: {
            id: targetUser._id.toString(),
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role,
          },
        });
      } catch (txError) {
        if (session) {
          try {
            await session.abortTransaction();
          } catch {
            // Ignore abort error
          }
        }
        // Fallback for standalone/local instances without replica set transactions
        const otherAdmins = await User.countDocuments({
          role: "admin",
          _id: { $ne: targetUser._id },
        });

        if (otherAdmins < 1) {
          return NextResponse.json(
            {
              success: false,
              message: "Cannot demote the last remaining administrator in the system.",
            },
            { status: 400 }
          );
        }

        targetUser.role = newRole as UserRole;
        await targetUser.save();
        await recordChange(oldRole);

        return NextResponse.json({
          success: true,
          message: `User "${targetUser.name}" role updated to "${newRole}" successfully.`,
          user: {
            id: targetUser._id.toString(),
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role,
          },
        });
      } finally {
        if (session) {
          try {
            await session.endSession();
          } catch {
            // Ignore session end error
          }
        }
      }
    }

    // Standard promotion / role change (e.g. student -> faculty or student -> admin)
    targetUser.role = newRole as UserRole;
    await targetUser.save();
    await recordChange(oldRole);

    return NextResponse.json({
      success: true,
      message: `User "${targetUser.name}" role updated to "${newRole}" successfully.`,
      user: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error("Admin user role modification error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update user role." },
      { status: 500 }
    );
  }
}
