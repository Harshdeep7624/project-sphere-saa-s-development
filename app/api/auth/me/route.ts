import { NextRequest, NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getCurrentUser(request);

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(authUser.userId).select(
      "name email role createdAt"
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve profile.",
      },
      { status: 500 }
    );
  }
}
