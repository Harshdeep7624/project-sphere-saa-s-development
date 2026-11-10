import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import { verifyUserSession } from "@/lib/auth";
import User from "@/models/User";
import { recordAuditLog } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { user: verifiedUser, error: authError } = await verifyUserSession(request);
    if (authError || !verifiedUser) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    const clientIp = getClientIp(request);
    const pwdRateLimit = await checkRateLimit(`pwdchange:user:${verifiedUser.userId}:${clientIp}`, 5, 900);
    if (!pwdRateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many password change attempts. Please try again in ${Math.ceil(pwdRateLimit.retryAfter / 60)} minutes.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(pwdRateLimit.retryAfter),
            "X-RateLimit-Limit": String(pwdRateLimit.limit),
            "X-RateLimit-Remaining": String(pwdRateLimit.remaining),
            "X-RateLimit-Reset": String(pwdRateLimit.reset),
          },
        }
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

    const { currentPassword, newPassword } = (body || {}) as Record<string, unknown>;

    if (typeof currentPassword !== "string" || !currentPassword) {
      return NextResponse.json(
        { success: false, message: "Current password is required." },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || !newPassword) {
      return NextResponse.json(
        { success: false, message: "New password is required." },
        { status: 400 }
      );
    }

    const byteLen = Buffer.byteLength(newPassword, "utf8");
    if (byteLen < 8 || byteLen > 72) {
      return NextResponse.json(
        {
          success: false,
          message: "New password must be between 8 and 72 bytes.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(verifiedUser.userId).select("+password name email role tokenVersion isActive");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { success: false, message: "Account has been suspended. Please contact an administrator." },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Incorrect current password." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    const nextVersion = (typeof user.tokenVersion === "number" ? user.tokenVersion : 0) + 1;
    user.tokenVersion = nextVersion;
    await user.save();

    // Record server-side audit log reliably
    await recordAuditLog(
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "PASSWORD_CHANGED",
      "User",
      user._id.toString(),
      { action: "Password updated successfully" }
    );

    const response = NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });

    // Refresh current user's JWT cookie with incremented tokenVersion so this session remains valid
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      const refreshedToken = jwt.sign(
        {
          sub: user._id.toString(),
          role: user.role,
          tokenVersion: nextVersion,
        },
        jwtSecret,
        { expiresIn: "1d" }
      );

      response.cookies.set("projectsphere_token", refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
      });
    }

    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update password." },
      { status: 500 }
    );
  }
}
