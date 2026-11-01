import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedCategories = [
  "Web Development",
  "AI/ML",
  "Data Science",
  "Mobile App",
  "Other",
];

function errorResponse(error: unknown) {
  console.error("Project operation error:", error);

  return NextResponse.json(
    {
      success: false,
      message: "Unable to process the project request.",
    },
    { status: 500 }
  );
}

// UPDATE PROJECT
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await connectDB();

    // Authenticate via the shared helper (validates cookie, JWT, role, ObjectId)
    const authUser = await getCurrentUser(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const allowedFields = [
      "title",
      "description",
      "category",
      "deadline",
      "githubUrl",
    ];

    const suppliedFields = Object.keys(body);

    if (
      suppliedFields.length === 0 ||
      suppliedFields.some((field) => !allowedFields.includes(field))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide valid project fields to update.",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if ("title" in body) {
      if (
        typeof body.title !== "string" ||
        body.title.trim().length < 3 ||
        body.title.trim().length > 100
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Title must be between 3 and 100 characters.",
          },
          { status: 400 }
        );
      }

      updates.title = body.title.trim();
    }

    if ("description" in body) {
      if (
        typeof body.description !== "string" ||
        body.description.trim().length < 1 ||
        body.description.trim().length > 2000
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Description must be between 1 and 2000 characters.",
          },
          { status: 400 }
        );
      }

      updates.description = body.description.trim();
    }

    if ("category" in body) {
      if (
        typeof body.category !== "string" ||
        !allowedCategories.includes(body.category)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select a valid project category.",
          },
          { status: 400 }
        );
      }

      updates.category = body.category;
    }

    if ("deadline" in body) {
      if (
        typeof body.deadline !== "string" ||
        !body.deadline.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Please provide a valid deadline.",
          },
          { status: 400 }
        );
      }

      const deadline = new Date(body.deadline);

      if (Number.isNaN(deadline.getTime())) {
        return NextResponse.json(
          {
            success: false,
            message: "Please provide a valid deadline.",
          },
          { status: 400 }
        );
      }

      updates.deadline = deadline;
    }

    if ("githubUrl" in body) {
      if (typeof body.githubUrl !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "GitHub URL must be text.",
          },
          { status: 400 }
        );
      }

      const githubUrl = body.githubUrl.trim();

      if (
        githubUrl.length > 300 ||
        (githubUrl !== "" &&
          !/^https:\/\/github\.com\/[^\s]+$/i.test(githubUrl))
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Enter a valid GitHub repository URL.",
          },
          { status: 400 }
        );
      }

      updates.githubUrl = githubUrl;
    }

    // Ownership enforced by matching both _id and createdBy
    const project = await Project.findOneAndUpdate(
      { _id: id, createdBy: authUser.userId },
      { $set: updates },
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).select(
      "title description category status deadline githubUrl createdAt"
    );

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found or you do not have permission to edit it.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project updated successfully.",
      project,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    return errorResponse(error);
  }
}

// DELETE PROJECT
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await connectDB();

    // Authenticate via the shared helper
    const authUser = await getCurrentUser(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID." },
        { status: 400 }
      );
    }

    // Ownership enforced by matching both _id and createdBy
    const project = await Project.findOneAndDelete({
      _id: id,
      createdBy: authUser.userId,
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found or you do not have permission to delete it.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully.",
      id: project._id.toString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
