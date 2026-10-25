import { cookies } from "next/headers";
import jwt, { type JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

export type UserRole = "student" | "faculty" | "admin";

export interface AuthUser {
userId: string;
role: UserRole;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
try {
const cookieStore = await cookies();
const token = cookieStore.get("projectsphere_token")?.value;

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
