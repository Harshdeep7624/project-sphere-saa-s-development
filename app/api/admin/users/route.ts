import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser, verifyAdmin } from "@/lib/auth";
import User from "@/models/User";

export const runtime = "nodejs";

/**
 * GET /api/admin/users
 * Returns a paginated list of registered users with:
 * - Filter by role (student, faculty, admin)
 * - Search by name or email
 * - Project count per user (calculated via aggregation)
 * - Excludes password hashes and sensitive authentication fields
 *
 * Strictly protected by database-backed verifyAdmin().
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);

    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    const roleParam = searchParams.get("role")?.trim().toLowerCase();
    const statusParam = searchParams.get("status")?.trim().toLowerCase();
    const searchParam = searchParams.get("search")?.trim();

    // Construct match filters
    const matchFilter: Record<string, unknown> = {};

    if (roleParam && ["student", "faculty", "admin"].includes(roleParam)) {
      matchFilter.role = roleParam;
    }

    if (statusParam === "active") {
      matchFilter.isActive = { $ne: false };
    } else if (statusParam === "suspended" || statusParam === "inactive") {
      matchFilter.isActive = false;
    }

    if (searchParam) {
      const escaped = searchParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      matchFilter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
      ];
    }

    await connectDB();

    const [totalUsers, usersWithProjectCount] = await Promise.all([
      User.countDocuments(matchFilter),
      User.aggregate([
        { $match: matchFilter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "projects",
            localField: "_id",
            foreignField: "createdBy",
            as: "userProjects",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            role: 1,
            isActive: 1,
            createdAt: 1,
            updatedAt: 1,
            projectCount: { $size: "$userProjects" },
          },
        },
      ]),
    ]);

    const totalPages = Math.ceil(totalUsers / limit) || 1;

    return NextResponse.json({
      success: true,
      users: usersWithProjectCount.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive !== false,
        projectCount: u.projectCount,
        createdAt: u.createdAt,
      })),
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Admin user directory error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve user directory." },
      { status: 500 }
    );
  }
}
