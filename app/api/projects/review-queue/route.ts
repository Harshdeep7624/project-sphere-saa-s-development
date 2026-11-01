import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasRole } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import "@/models/User"; // Ensure User model is registered for populate

export const runtime = "nodejs";

// Status values valid for the review workflow
const ALLOWED_STATUSES = ["Pending", "Approved", "Rejected", "All"] as const;
type ReviewStatus = (typeof ALLOWED_STATUSES)[number];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    if (!hasRole(user, ["faculty", "admin"])) {
      return NextResponse.json(
        {
          success: false,
          message: "Only faculty and admins can access the review queue.",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const requestedStatus = searchParams.get("status") ?? "Pending";

    // Allowlist: reject any status value outside the review workflow
    if (!ALLOWED_STATUSES.includes(requestedStatus as ReviewStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid status filter. Allowed values: ${ALLOWED_STATUSES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const query: Record<string, unknown> = {};
    if (requestedStatus !== "All") {
      query.status = requestedStatus;
    }

    const projects = await Project.find(query)
      .populate("createdBy", "name email")
      .select("title description category status deadline githubUrl createdBy createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const formattedProjects = projects.map((p) => {
      const owner =
        p.createdBy && typeof p.createdBy === "object" && "_id" in p.createdBy
          ? (p.createdBy as { name?: string; email?: string })
          : null;

      return {
        _id: p._id.toString(),
        id: p._id.toString(),
        title: p.title,
        description: p.description,
        category: p.category,
        status: p.status,
        deadline:
          p.deadline instanceof Date ? p.deadline.toISOString() : p.deadline,
        githubUrl: p.githubUrl || "",
        createdAt:
          p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
        student: owner
          ? {
              name: owner.name || "Student",
              email: owner.email || "",
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedProjects.length,
      projects: formattedProjects,
    });
  } catch (error) {
    console.error("Review queue fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to fetch review queue." },
      { status: 500 }
    );
  }
}
