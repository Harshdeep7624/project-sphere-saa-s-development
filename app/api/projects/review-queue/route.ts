import { NextRequest, NextResponse } from "next/server";
import { verifyUserSession, hasRole } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import "@/models/User"; // Ensure User model is registered for populate

export const runtime = "nodejs";

// Status values valid for the review workflow
const ALLOWED_STATUSES = ["Pending", "Approved", "Rejected", "In Progress", "Completed", "All"] as const;
type ReviewStatus = (typeof ALLOWED_STATUSES)[number];

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyUserSession(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
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
      .populate("reviewedBy", "name email")
      .select("title description category status deadline githubUrl createdBy createdAt reviewNotes reviewedBy reviewedAt")
      .sort({ createdAt: -1 })
      .lean();

    const formattedProjects = projects.map((p) => {
      const owner =
        p.createdBy && typeof p.createdBy === "object" && "_id" in p.createdBy
          ? (p.createdBy as { name?: string; email?: string })
          : null;

      const reviewer =
        p.reviewedBy && typeof p.reviewedBy === "object" && "_id" in p.reviewedBy
          ? (p.reviewedBy as { name?: string; email?: string })
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
        reviewNotes: p.reviewNotes || "",
        reviewedBy: reviewer
          ? {
              name: reviewer.name || "Reviewer",
              email: reviewer.email || "",
            }
          : null,
        reviewedAt:
          p.reviewedAt instanceof Date
            ? p.reviewedAt.toISOString()
            : p.reviewedAt || null,
        student: owner
          ? {
              name: owner.name || "Student",
              email: owner.email || "",
            }
          : null,
      };
    });

    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      inProgressCount,
      completedCount,
      totalCount,
      myReviewsCount,
    ] = await Promise.all([
      Project.countDocuments({ status: "Pending" }),
      Project.countDocuments({ status: "Approved" }),
      Project.countDocuments({ status: "Rejected" }),
      Project.countDocuments({ status: "In Progress" }),
      Project.countDocuments({ status: "Completed" }),
      Project.countDocuments({}),
      Project.countDocuments({ reviewedBy: user.userId }),
    ]);

    return NextResponse.json({
      success: true,
      count: formattedProjects.length,
      projects: formattedProjects,
      stats: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        inProgress: inProgressCount,
        completed: completedCount,
        reviewedByYou: myReviewsCount,
        totalReviewed: approvedCount + rejectedCount,
      },
    });
  } catch (error) {
    console.error("Review queue fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to fetch review queue." },
      { status: 500 }
    );
  }
}
