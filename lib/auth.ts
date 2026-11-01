import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

export type UserRole = "student" | "faculty" | "admin";

export interface AuthUser {
  userId: string;
  role: UserRole;
}

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
    };
  } catch {
    return null;
  }
}

export function hasRole(
  user: AuthUser | null,
  allowedRoles: UserRole[]
): boolean {
  return user !== null && allowedRoles.includes(user.role);
}
