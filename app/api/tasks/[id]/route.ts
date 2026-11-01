import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Task, { TaskCategory, TaskPriority, TaskStatus } from "@/models/Task";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

const updatableFields = [
  "title",
  "description",
  "category",
  "priority",
  "status",
  "dueDate",
];

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid task ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const task = await Task.findOne({
      _id: id,
      createdBy: user.userId,
    }).lean();

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          message: "Task not found or you do not have permission to view it.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: {
        _id: task._id.toString(),
        id: task._id.toString(),
        title: task.title,
        description: task.description || "",
        category: task.category,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate,
        createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
        updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get task error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve task." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid task ID." },
        { status: 400 }
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

    const payload = body as Record<string, unknown>;
    const suppliedFields = Object.keys(payload);

    if (
      suppliedFields.length === 0 ||
      suppliedFields.some((field) => !updatableFields.includes(field))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Provide valid task fields to update (${updatableFields.join(", ")}).`,
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if ("title" in payload) {
      if (
        typeof payload.title !== "string" ||
        payload.title.trim().length < 3 ||
        payload.title.trim().length > 120
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Task title must be between 3 and 120 characters.",
          },
          { status: 400 }
        );
      }
      updates.title = payload.title.trim();
    }

    if ("description" in payload) {
      if (payload.description === null || payload.description === "") {
        updates.description = "";
      } else if (typeof payload.description !== "string") {
        return NextResponse.json(
          { success: false, message: "Description must be text." },
          { status: 400 }
        );
      } else if (payload.description.trim().length > 2000) {
        return NextResponse.json(
          {
            success: false,
            message: "Description cannot exceed 2000 characters.",
          },
          { status: 400 }
        );
      } else {
        updates.description = payload.description.trim();
      }
    }

    if ("category" in payload) {
      if (
        typeof payload.category !== "string" ||
        !allowedCategories.includes(payload.category as TaskCategory)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Category must be one of: ${allowedCategories.join(", ")}.`,
          },
          { status: 400 }
        );
      }
      updates.category = payload.category;
    }

    if ("priority" in payload) {
      if (
        typeof payload.priority !== "string" ||
        !allowedPriorities.includes(payload.priority as TaskPriority)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Priority must be one of: ${allowedPriorities.join(", ")}.`,
          },
          { status: 400 }
        );
      }
      updates.priority = payload.priority;
    }

    if ("status" in payload) {
      if (
        typeof payload.status !== "string" ||
        !allowedStatuses.includes(payload.status as TaskStatus)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Status must be one of: ${allowedStatuses.join(", ")}.`,
          },
          { status: 400 }
        );
      }
      updates.status = payload.status;
    }

    if ("dueDate" in payload) {
      if (
        typeof payload.dueDate !== "string" &&
        !(payload.dueDate instanceof Date)
      ) {
        return NextResponse.json(
          { success: false, message: "Please provide a valid due date." },
          { status: 400 }
        );
      }

      const parsedDueDate = new Date(payload.dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return NextResponse.json(
          { success: false, message: "Please provide a valid due date." },
          { status: 400 }
        );
      }
      updates.dueDate = parsedDueDate;
    }

    await connectDB();

    const task = await Task.findOneAndUpdate(
      { _id: id, createdBy: user.userId },
      { $set: updates },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).lean();

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          message: "Task not found or you do not have permission to edit it.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Task updated successfully.",
      task: {
        _id: task._id.toString(),
        id: task._id.toString(),
        title: task.title,
        description: task.description || "",
        category: task.category,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate instanceof Date ? task.dueDate.toISOString() : task.dueDate,
        createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
        updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update task." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid task ID." },
        { status: 400 }
      );
    }

    await connectDB();

    const task = await Task.findOneAndDelete({
      _id: id,
      createdBy: user.userId,
    });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          message: "Task not found or you do not have permission to delete it.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully.",
      id: task._id.toString(),
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to delete task." },
      { status: 500 }
    );
  }
}
