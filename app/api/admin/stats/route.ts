import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser, verifyAdmin } from "@/lib/auth";
import User from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";

export const runtime = "nodejs";

/**
 * GET /api/admin/stats
 * Aggregates live system-wide statistics from MongoDB Atlas:
 * - User counts (total, students, faculty, admins)
 * - Project counts (total, pending, approved, rejected, in-progress, completed)
 * - Project category distribution
 * - Task counts (total, completed, in-progress, pending) & completion velocity
 * - Recent 5 user registrations
 * - Recent 5 project submissions with author details
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

    await connectDB();

    // Parallel aggregation across collections for maximum speed
    const [
      userRoleCounts,
      activeUserCount,
      suspendedUserCount,
      projectStatusCounts,
      projectCategoryCounts,
      taskStatusCounts,
      recentUsers,
      recentProjects,
      recentReviews,
    ] = await Promise.all([
      // 1. User distribution by role
      User.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]),

      // 2. Active users count
      User.countDocuments({ isActive: { $ne: false } }),

      // 3. Suspended users count
      User.countDocuments({ isActive: false }),

      // 4. Project distribution by status
      Project.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // 5. Project distribution by category
      Project.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),

      // 6. Task distribution by status
      Task.aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // 7. Recent 5 user registrations (excluding sensitive fields)
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email role createdAt")
        .lean(),

      // 8. Recent 5 project submissions with author information
      Project.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("createdBy", "name email")
        .select("title category status deadline createdAt createdBy")
        .lean(),

      // 9. Recent 5 project reviews with reviewer and author details
      Project.find({
        status: { $in: ["Approved", "Rejected"] },
        reviewedAt: { $ne: null },
      })
        .sort({ reviewedAt: -1 })
        .limit(5)
        .populate("reviewedBy", "name email")
        .populate("createdBy", "name email")
        .select("title category status reviewNotes reviewedAt reviewedBy createdBy")
        .lean(),
    ]);

    // Parse user metrics
    let totalStudents = 0;
    let totalFaculty = 0;
    let totalAdmins = 0;
    let totalUsers = 0;

    for (const item of userRoleCounts) {
      totalUsers += item.count;
      if (item._id === "student") totalStudents = item.count;
      else if (item._id === "faculty") totalFaculty = item.count;
      else if (item._id === "admin") totalAdmins = item.count;
    }

    // Parse project metrics
    let totalProjects = 0;
    const projectsByStatus: Record<string, number> = {
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      "In Progress": 0,
      Completed: 0,
    };

    for (const item of projectStatusCounts) {
      totalProjects += item.count;
      if (item._id && item._id in projectsByStatus) {
        projectsByStatus[item._id] = item.count;
      }
    }

    // Parse project category breakdown
    const projectsByCategory: Record<string, number> = {};
    for (const item of projectCategoryCounts) {
      if (item._id) {
        projectsByCategory[item._id] = item.count;
      }
    }

    // Parse task metrics
    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;

    for (const item of taskStatusCounts) {
      totalTasks += item.count;
      if (item._id === "Completed") completedTasks = item.count;
      else if (item._id === "In Progress") inProgressTasks = item.count;
      else if (item._id === "Pending") pendingTasks = item.count;
    }

    const taskCompletionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUserCount,
          suspended: suspendedUserCount,
          students: totalStudents,
          faculty: totalFaculty,
          admins: totalAdmins,
        },
        projects: {
          total: totalProjects,
          pending: projectsByStatus.Pending,
          approved: projectsByStatus.Approved,
          rejected: projectsByStatus.Rejected,
          inProgress: projectsByStatus["In Progress"],
          completed: projectsByStatus.Completed,
          byCategory: projectsByCategory,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          pending: pendingTasks,
          completionRate: taskCompletionRate,
        },
        recentRegistrations: recentUsers.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
        })),
        recentSubmissions: recentProjects.map((p) => {
          const owner = p.createdBy as unknown as { name?: string; email?: string } | null;
          return {
            id: p._id.toString(),
            title: p.title,
            category: p.category,
            status: p.status,
            deadline: p.deadline,
            createdAt: p.createdAt,
            authorName: owner?.name || "Unknown Student",
            authorEmail: owner?.email || "",
          };
        }),
        recentReviews: recentReviews.map((r) => {
          const reviewer = r.reviewedBy as unknown as { name?: string; email?: string } | null;
          const student = r.createdBy as unknown as { name?: string; email?: string } | null;
          return {
            id: r._id.toString(),
            title: r.title,
            category: r.category,
            status: r.status,
            reviewNotes: r.reviewNotes || "",
            reviewedAt: r.reviewedAt,
            reviewerName: reviewer?.name || "Faculty",
            reviewerEmail: reviewer?.email || "",
            studentName: student?.name || "Student",
            studentEmail: student?.email || "",
          };
        }),
      },
    });
  } catch (error) {
    console.error("Admin stats aggregation error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to aggregate platform statistics." },
      { status: 500 }
    );
  }
}
