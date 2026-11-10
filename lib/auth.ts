import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export type UserRole = "student" | "faculty" | "admin";

export interface AuthUser {
  userId: string;
  role: UserRole;
  tokenVersion?: number;
}

export interface VerifiedUser extends AuthUser {
  email: string;
  name: string;
  isActive: boolean;
  tokenVersion: number;
}

export type SessionVerification =
  | { user: VerifiedUser; error: null }
  | { user: null; error: { status: 401 | 403 | 500; message: string } };

/**
 * Standard stateless JWT token resolver.
 * Extracts and decodes the projectsphere_token cookie.
 */
export async function getCurrentUser(
  request?: NextRequest | Request
): Promise<AuthUser | null> {
  try {
    let token: string | undefined;

    if (
      request &&
      "cookies" in request &&
      typeof (request as NextRequest).cookies?.get === "function"
    ) {
      token = (request as NextRequest).cookies.get("projectsphere_token")?.value;
    }

    if (!token && request && "headers" in request) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/projectsphere_token=([^;]+)/);
        if (match) token = match[1];
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get("projectsphere_token")?.value;
      } catch {
        // Outside Next.js request lifecycle
      }
    }

    if (!token || !process.env.JWT_SECRET) {
      return null;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as JwtPayload;

    if (
      typeof decoded.sub !== "string" ||
      typeof decoded.role !== "string" ||
      !["student", "faculty", "admin"].includes(decoded.role)
    ) {
      return null;
    }

    if (!mongoose.Types.ObjectId.isValid(decoded.sub)) {
      return null;
    }

    return {
      userId: decoded.sub,
      role: decoded.role as UserRole,
      tokenVersion: typeof decoded.tokenVersion === "number" ? decoded.tokenVersion : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Validates whether an authenticated user possesses one of the allowed roles.
 */
export function hasRole(
  user: AuthUser | null,
  allowedRoles: UserRole[]
): boolean {
  return user !== null && allowedRoles.includes(user.role);
}

/**
 * Comprehensive session verification.
 * 1. Resolves and validates the JWT cookie.
 * 2. Queries MongoDB to confirm account existence and active status.
 * 3. Enforces tokenVersion matching to instantly invalidate revoked sessions after password changes.
 * 4. Differentiates between unauthenticated (401) and suspended (403) states.
 */
export async function verifyUserSession(
  request?: NextRequest | Request
): Promise<SessionVerification> {
  const authUser = await getCurrentUser(request);
  if (!authUser) {
    return {
      user: null,
      error: { status: 401, message: "Please log in first." },
    };
  }

  try {
    await connectDB();
    const dbUser = await User.findById(authUser.userId)
      .select("name email role isActive tokenVersion")
      .lean();

    if (!dbUser) {
      return {
        user: null,
        error: { status: 401, message: "User account not found." },
      };
    }

    if (dbUser.isActive === false) {
      return {
        user: null,
        error: {
          status: 403,
          message: "Account has been suspended. Please contact an administrator.",
        },
      };
    }

    const dbTokenVersion = typeof dbUser.tokenVersion === "number" ? dbUser.tokenVersion : 0;
    if (authUser.tokenVersion !== undefined) {
      if (authUser.tokenVersion !== dbTokenVersion) {
        return {
          user: null,
          error: {
            status: 401,
            message: "Session has expired due to a recent password change. Please log in again.",
          },
        };
      }
    } else if (dbTokenVersion > 0) {
      // Legacy token issued before tokenVersion was bumped
      return {
        user: null,
        error: {
          status: 401,
          message: "Session has expired. Please log in again.",
        },
      };
    }

    return {
      user: {
        userId: dbUser._id.toString(),
        role: dbUser.role as UserRole,
        email: dbUser.email,
        name: dbUser.name,
        isActive: true,
        tokenVersion: dbTokenVersion,
      },
      error: null,
    };
  } catch (error) {
    console.error("Session verification error:", error);
    return {
      user: null,
      error: { status: 500, message: "Unable to verify session." },
    };
  }
}

/**
 * Database-backed role verification.
 * Resolves the authenticated user and confirms their active status and tokenVersion in MongoDB.
 */
export async function getVerifiedUser(
  request?: NextRequest | Request
): Promise<VerifiedUser | null> {
  const result = await verifyUserSession(request);
  return result.user;
}

/**
 * Strictly verifies that the user is currently an active administrator in the database.
 * Used by server-side layout guards and administrative API routes.
 */
export async function verifyAdmin(
  request?: NextRequest | Request
): Promise<VerifiedUser | null> {
  const verifiedUser = await getVerifiedUser(request);
  if (!verifiedUser || verifiedUser.role !== "admin") {
    return null;
  }
  return verifiedUser;
}

/**
 * Validates whether an administrator role modification is safe:
 * 1. An admin cannot demote their own account (prevents self-demotion lockout).
 * 2. An admin cannot demote another admin if no other administrators exist in MongoDB (prevents system lockout).
 */
export async function canModifyUserRole(
  actorAdminId: string,
  targetUserId: string,
  newRole: UserRole
): Promise<{ allowed: boolean; reason?: string }> {
  // Prevent self-demotion
  if (actorAdminId === targetUserId && newRole !== "admin") {
    return {
      allowed: false,
      reason: "Administrators cannot demote their own account to prevent accidental lockout.",
    };
  }

  // If demoting an existing administrator, verify that at least one OTHER administrator exists
  if (newRole !== "admin") {
    await connectDB();
    const targetUser = await User.findById(targetUserId).select("role").lean();
    if (targetUser && targetUser.role === "admin") {
      const otherAdmins = await User.countDocuments({
        role: "admin",
        _id: { $ne: targetUserId },
      });
      if (otherAdmins < 1) {
        return {
          allowed: false,
          reason: "Cannot demote the last remaining administrator in the system.",
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Validates whether an administrator account deactivation is safe:
 * 1. An admin cannot deactivate their own account.
 * 2. An admin cannot deactivate the last active administrator in the system.
 */
export async function canModifyUserStatus(
  actorAdminId: string,
  targetUserId: string,
  newActiveState: boolean
): Promise<{ allowed: boolean; reason?: string }> {
  if (actorAdminId === targetUserId && !newActiveState) {
    return {
      allowed: false,
      reason: "Administrators cannot deactivate their own account.",
    };
  }

  if (!newActiveState) {
    await connectDB();
    const targetUser = await User.findById(targetUserId).select("role isActive").lean();
    if (targetUser && targetUser.role === "admin") {
      const activeAdmins = await User.countDocuments({
        role: "admin",
        isActive: { $ne: false },
        _id: { $ne: targetUserId },
      });
      if (activeAdmins < 1) {
        return {
          allowed: false,
          reason: "Cannot deactivate the last active administrator in the system.",
        };
      }
    }
  }

  return { allowed: true };
}
