import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getCurrentUser, verifyAdmin } from "@/lib/auth";
import Project from "@/models/Project";
import "@/models/User";

export const runtime = "nodejs";

/**
 * GET /api/admin/projects
 * Returns a paginated list of all projects across the platform with:
 * - Search by title or description
 * - Filter by status (Pending, Approved, Rejected, In Progress, Completed)
 * - Filter by category (Web Development, AI/ML, Data Science, Mobile App, Other)
 * - Filter by studentId
 * - Populates author details (name, email) safely
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

    const statusParam = searchParams.get("status")?.trim();
    const categoryParam = searchParams.get("category")?.trim();
    const searchParam = searchParams.get("search")?.trim();
    const studentIdParam = searchParams.get("studentId")?.trim();

    // Construct match filters
    const query: Record<string, unknown> = {};

    if (
      statusParam &&
      statusParam !== "All" &&
      statusParam !== "All statuses" &&
      ["Pending", "Approved", "Rejected", "In Progress", "Completed"].includes(statusParam)
    ) {
      query.status = statusParam;
    }

    if (
      categoryParam &&
      categoryParam !== "All" &&
      categoryParam !== "All categories"
    ) {
      query.category = categoryParam;
    }

    if (studentIdParam && mongoose.Types.ObjectId.isValid(studentIdParam)) {
      query.createdBy = new mongoose.Types.ObjectId(studentIdParam);
    }

    if (searchParam) {
      const escaped = searchParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    await connectDB();

    const [totalProjects, rawProjects] = await Promise.all([
      Project.countDocuments(query),
      Project.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email role")
        .populate("reviewedBy", "name email role")
        .lean(),
    ]);

    const totalPages = Math.ceil(totalProjects / limit) || 1;

    const projects = rawProjects.map((p) => {
      const owner = p.createdBy as unknown as {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        email?: string;
        role?: string;
      } | null;

      const reviewer = p.reviewedBy as unknown as {
        _id?: mongoose.Types.ObjectId;
        name?: string;
        email?: string;
        role?: string;
      } | null;

      return {
        id: p._id.toString(),
        title: p.title,
        description: p.description,
        category: p.category,
        status: p.status,
        deadline: p.deadline,
        githubUrl: p.githubUrl || "",
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        reviewNotes: p.reviewNotes || "",
        reviewedAt: p.reviewedAt || null,
        reviewer: reviewer
          ? {
              id: reviewer._id ? reviewer._id.toString() : "",
              name: reviewer.name || "Faculty",
              email: reviewer.email || "",
              role: reviewer.role || "faculty",
            }
          : null,
        author: {
          id: owner?._id ? owner._id.toString() : "",
          name: owner?.name || "Unknown Author",
          email: owner?.email || "",
          role: owner?.role || "student",
        },
      };
    });

    return NextResponse.json({
      success: true,
      projects,
      pagination: {
        page,
        limit,
        total: totalProjects,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Admin projects repository error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve platform projects." },
      { status: 500 }
    );
  }
}
