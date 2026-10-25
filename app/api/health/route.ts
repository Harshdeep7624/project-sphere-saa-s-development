import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET() {
  try {
    await connectDB();

    return NextResponse.json({
      success: true,
      message: "ProjectSphere connected to MongoDB successfully!",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed. Check server logs.",
      },
      { status: 500 }
    );
  }
}