import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Task, { TaskCategory, TaskPriority, TaskStatus } from "@/models/Task";
import Project from "@/models/Project";
import { verifyUserSession } from "@/lib/auth";

export const runtime = "nodejs";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const allowedCategories: TaskCategory[] = [
  "General",
  "Planning",
  "Research",
  "Documentation",
  "Development",
  "Submission",
  "Other",
];

const allowedPriorities: TaskPriority[] = ["Low", "Medium", "High"];

const allowedStatuses: TaskStatus[] = ["Pending", "In Progress", "Completed"];

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyUserSession(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const searchParam = searchParams.get("search");
    const categoryParam = searchParams.get("category");
    const priorityParam = searchParams.get("priority");
    const statusParam = searchParams.get("status");

    let page = DEFAULT_PAGE;
    if (pageParam !== null) {
      const trimmedPage = pageParam.trim();
      if (!/^[1-9]\d*$/.test(trimmedPage)) {
        return NextResponse.json(
          {
            success: false,
            message: "Page must be a positive integer.",
          },
          { status: 400 }
        );
      }
      const parsedPage = parseInt(trimmedPage, 10);
      if (!Number.isSafeInteger(parsedPage) || parsedPage > 1000000) {
        return NextResponse.json(
          {
            success: false,
            message: "Page number is out of range.",
          },
          { status: 400 }
        );
      }
      page = parsedPage;
    }

    let limit = DEFAULT_LIMIT;
    if (limitParam !== null) {
      const trimmedLimit = limitParam.trim();
      if (!/^[1-9]\d*$/.test(trimmedLimit)) {
        return NextResponse.json(
          {
            success: false,
            message: "Limit must be a positive integer between 1 and 100.",
          },
          { status: 400 }
        );
      }
      const parsedLimit = parseInt(trimmedLimit, 10);
      if (parsedLimit > MAX_LIMIT) {
        return NextResponse.json(
          {
            success: false,
            message: "Limit cannot exceed 100.",
          },
          { status: 400 }
        );
      }
      limit = parsedLimit;
    }

    await connectDB();

    // Build filter query for search and filtering across all records
    const filterQuery: Record<string, unknown> = { createdBy: user.userId };

    if (searchParam && searchParam.trim()) {
      const escaped = searchParam.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filterQuery.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { priority: regex },
        { status: regex },
      ];
    }

    if (categoryParam && categoryParam.trim() && categoryParam !== "All categories") {
      filterQuery.category = categoryParam.trim();
    }

    if (priorityParam && priorityParam.trim() && priorityParam !== "All priorities") {
      filterQuery.priority = priorityParam.trim();
    }

    if (statusParam && statusParam.trim() && statusParam !== "All statuses") {
      filterQuery.status = statusParam.trim();
    }

    const skip = (page - 1) * limit;
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 86400000);

    // Fetch filtered count, paginated tasks, and global statistics in parallel
    const [total, tasks, totalAll, inProgressCount, completedCount, dueSoonCount] = await Promise.all([
      Task.countDocuments(filterQuery),
      Task.find(filterQuery)
        .populate("projectId", "title category status")
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments({ createdBy: user.userId }),
      Task.countDocuments({ createdBy: user.userId, status: "In Progress" }),
      Task.countDocuments({ createdBy: user.userId, status: "Completed" }),
      Task.countDocuments({
        createdBy: user.userId,
        status: { $ne: "Completed" },
        dueDate: { $lte: sevenDaysLater },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const formattedTasks = tasks.map((task) => {
      let formattedProject = null;
      if (task.projectId && typeof task.projectId === "object" && "_id" in task.projectId) {
        const proj = task.projectId as {
          _id: { toString(): string };
          title: string;
          category?: string;
          status?: string;
        };
        formattedProject = {
          _id: proj._id.toString(),
          title: proj.title,
          category: proj.category,
          status: proj.status,
        };
      }

      return {
        _id: task._id.toString(),
        id: task._id.toString(),
        title: task.title,
        description: task.description || "",
        category: task.category,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate,
        projectId: formattedProject,
        createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
        updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      count: formattedTasks.length,
      total,
      page,
      limit,
      totalPages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
      stats: {
        total: totalAll,
        inProgress: inProgressCount,
        dueSoon: dueSoonCount,
        completed: completedCount,
      },
      tasks: formattedTasks,
    });
  } catch (error) {
    console.error("Fetch tasks error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to fetch tasks." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyUserSession(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Request body must be an object." },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      category = "General",
      priority = "Medium",
      status = "Pending",
      dueDate,
      projectId,
    } = body as Record<string, unknown>;

    // Validate optional projectId format before DB call
    let targetProjectId: string | null = null;
    if (projectId !== undefined && projectId !== null && projectId !== "") {
      if (typeof projectId !== "string" || !mongoose.isValidObjectId(projectId)) {
        return NextResponse.json(
          { success: false, message: "Invalid project ID format." },
          { status: 400 }
        );
      }
      targetProjectId = projectId;
    }

    // 1. Validate title
    if (
      typeof title !== "string" ||
      title.trim().length < 3 ||
      title.trim().length > 120
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Task title must be between 3 and 120 characters.",
        },
        { status: 400 }
      );
    }

    // 2. Validate description (optional)
    let validatedDescription = "";
    if (description !== undefined && description !== null && description !== "") {
      if (typeof description !== "string") {
        return NextResponse.json(
          { success: false, message: "Description must be text." },
          { status: 400 }
        );
      }
      if (description.trim().length > 2000) {
        return NextResponse.json(
          {
            success: false,
            message: "Description cannot exceed 2000 characters.",
          },
          { status: 400 }
        );
      }
      validatedDescription = description.trim();
    }

    // 3. Validate category
    if (
      typeof category !== "string" ||
      !allowedCategories.includes(category as TaskCategory)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Category must be one of: ${allowedCategories.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // 4. Validate priority
    if (
      typeof priority !== "string" ||
      !allowedPriorities.includes(priority as TaskPriority)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Priority must be one of: ${allowedPriorities.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // 5. Validate status
    if (
      typeof status !== "string" ||
      !allowedStatuses.includes(status as TaskStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Status must be one of: ${allowedStatuses.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // 6. Validate dueDate
    if (
      typeof dueDate !== "string" &&
      !(dueDate instanceof Date)
    ) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid task due date." },
        { status: 400 }
      );
    }

    const parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid due date." },
        { status: 400 }
      );
    }

    await connectDB();

    let validatedProjectId: mongoose.Types.ObjectId | null = null;
    let associatedProject: {
      _id: string;
      title: string;
      category?: string;
      status?: string;
    } | null = null;

    if (targetProjectId) {
      const project = await Project.findOne({
        _id: targetProjectId,
        createdBy: user.userId,
      }).lean();

      if (!project) {
        return NextResponse.json(
          {
            success: false,
            message: "Project not found or you do not have permission to attach tasks to it.",
          },
          { status: 404 }
        );
      }

      validatedProjectId = new mongoose.Types.ObjectId(targetProjectId);
      associatedProject = {
        _id: project._id.toString(),
        title: project.title,
        category: project.category,
        status: project.status,
      };
    }

    // 7. Save task strictly bound to authenticated user
    const task = await Task.create({
      title: title.trim(),
      description: validatedDescription,
      category: category as TaskCategory,
      priority: priority as TaskPriority,
      status: status as TaskStatus,
      dueDate: parsedDueDate,
      projectId: validatedProjectId,
      createdBy: user.userId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Task created successfully!",
        task: {
          _id: task._id.toString(),
          id: task._id.toString(),
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate.toISOString(),
          projectId: associatedProject,
          createdAt: task.createdAt?.toISOString(),
          updatedAt: task.updatedAt?.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to create task. Please try again." },
      { status: 500 }
    );
  }
}
