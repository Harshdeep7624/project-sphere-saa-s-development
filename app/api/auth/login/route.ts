import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
});

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // Rate limiting: max 10 login requests per 15 minutes per IP
    const ipRateLimit = await checkRateLimit(`login:ip:${clientIp}`, 10, 900);
    if (!ipRateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many login attempts. Please try again in ${Math.ceil(ipRateLimit.retryAfter / 60)} minutes.`,
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
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email and password.",
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    // Rate limiting: max 5 login requests per 15 minutes per target email (brute force protection)
    const emailRateLimit = await checkRateLimit(`login:email:${email}`, 5, 900);
    if (!emailRateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many login attempts for this account. Please try again in ${Math.ceil(emailRateLimit.retryAfter / 60)} minutes.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(emailRateLimit.retryAfter),
            "X-RateLimit-Limit": String(emailRateLimit.limit),
            "X-RateLimit-Remaining": String(emailRateLimit.remaining),
            "X-RateLimit-Reset": String(emailRateLimit.reset),
          },
        }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is missing from environment variables.");

      return NextResponse.json(
        {
          success: false,
          message: "Server configuration error.",
        },
        { status: 500 }
      );
    }

    await connectDB();

    // Password is excluded by default in the User model,
    // so explicitly include it for password verification.
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your account has been deactivated. Please contact an administrator.",
        },
        { status: 403 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role,
        tokenVersion: typeof user.tokenVersion === "number" ? user.tokenVersion : 0,
      },
      jwtSecret,
      { expiresIn: "1d" }
    );

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful!",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 }
    );

    response.cookies.set("projectsphere_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: unknown) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to log in. Please try again later.",
      },
      { status: 500 }
    );
  }
}
