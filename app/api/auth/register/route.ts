import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { recordAuditLog } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // Rate limiting: max 10 account registrations per hour per IP
    const ipRateLimit = await checkRateLimit(`register:ip:${clientIp}`, 10, 3600);
    if (!ipRateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many registration attempts. Please try again in ${Math.ceil(ipRateLimit.retryAfter / 60)} minutes.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipRateLimit.retryAfter),
            "X-RateLimit-Limit": String(ipRateLimit.limit),
            "X-RateLimit-Remaining": String(ipRateLimit.remaining),
            "X-RateLimit-Reset": String(ipRateLimit.reset),
          },
        }
      );
    }

    const body: unknown = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid name, email, or password. Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const { name, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
      isActive: true,
    });

    // Record server-side audit log
    await recordAuditLog(
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "USER_REGISTERED",
      "User",
      user._id.toString(),
      { role: user.role }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully!",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    console.error("Registration error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create account. Please try again later.",
      },
      { status: 500 }
    );
  }
}
