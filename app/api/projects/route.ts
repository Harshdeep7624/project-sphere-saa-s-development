import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate via the shared helper (validates cookie, JWT, role, ObjectId)
    const authUser = await getCurrentUser(request);

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Please log in first.",
        },
        { status: 401 }
      );
    }

    // 2. Connect to MongoDB
    await connectDB();

    // 3. Read and validate the request body
    const body = await request.json();

    const {
      title,
      description,
      category,
      deadline,
      githubUrl,
    } = body;

    const allowedCategories = [
      "Web Development",
      "AI/ML",
      "Data Science",
      "Mobile App",
      "Other",
    ];

    if (
      typeof title !== "string" ||
      title.trim().length < 3 ||
      title.trim().length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Title must be between 3 and 100 characters.",
        },
        { status: 400 }
      );
    }

    if (
      typeof description !== "string" ||
      description.trim().length < 1 ||
      description.trim().length > 2000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Description must be between 1 and 2000 characters.",
        },
        { status: 400 }
      );
    }

    if (
      typeof category !== "string" ||
      !allowedCategories.includes(category)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a valid project category.",
        },
        { status: 400 }
      );
    }

    if (typeof deadline !== "string" || !deadline.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a project deadline.",
        },
        { status: 400 }
      );
    }

    const parsedDeadline = new Date(deadline);

    if (Number.isNaN(parsedDeadline.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid deadline.",
        },
        { status: 400 }
      );
    }

    // 4. Validate the optional GitHub URL
    let validatedGithubUrl = "";

    if (githubUrl !== undefined && githubUrl !== "") {
      if (typeof githubUrl !== "string") {
        return NextResponse.json(
          {
            success: false,
            message: "GitHub URL must be text.",
          },
          { status: 400 }
        );
      }

      validatedGithubUrl = githubUrl.trim();

      if (validatedGithubUrl.length > 300) {
        return NextResponse.json(
          {
            success: false,
            message: "GitHub URL is too long.",
          },
          { status: 400 }
        );
      }

      if (
        !/^https:\/\/github\.com\/[^\s]+$/i.test(validatedGithubUrl)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Enter a valid GitHub repository URL.",
          },
          { status: 400 }
        );
      }
    }

    // 5. Save the project to MongoDB, bound to the authenticated user
    const project = await Project.create({
      title: title.trim(),
      description: description.trim(),
      category,
      deadline: parsedDeadline,
      githubUrl: validatedGithubUrl,
      createdBy: authUser.userId,
      // Status defaults to Pending in the Project model
    });

    // 6. Return the created project
    return NextResponse.json(
      {
        success: true,
        message: "Project created successfully!",
        project: {
          id: project._id.toString(),
          title: project.title,
          description: project.description,
          category: project.category,
          status: project.status,
          deadline: project.deadline,
          githubUrl: project.githubUrl,
          createdBy: project.createdBy.toString(),
          createdAt: project.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle malformed JSON
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    console.error("Create project error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create project. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate via the shared helper
    const authUser = await getCurrentUser(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const searchParam = searchParams.get("search");
    const categoryParam = searchParams.get("category");
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

    // Connect to MongoDB
    await connectDB();

    // Build filter query for search and filtering across all records
    const filterQuery: Record<string, unknown> = { createdBy: authUser.userId };

    if (searchParam && searchParam.trim()) {
      const escaped = searchParam.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filterQuery.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { status: regex },
      ];
    }

    if (categoryParam && categoryParam.trim() && categoryParam !== "All categories") {
      filterQuery.category = categoryParam.trim();
    }

    if (statusParam && statusParam.trim() && statusParam !== "All statuses") {
      filterQuery.status = statusParam.trim();
    }

    const skip = (page - 1) * limit;

    // Fetch filtered count, paginated projects, and global statistics in parallel
    const [total, projects, totalAll, activeCount, completedCount, pendingCount] = await Promise.all([
      Project.countDocuments(filterQuery),
      Project.find(filterQuery)
        .select("title description category status deadline githubUrl createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments({ createdBy: authUser.userId }),
      Project.countDocuments({
        createdBy: authUser.userId,
        status: { $in: ["In Progress", "Approved"] },
      }),
      Project.countDocuments({
        createdBy: authUser.userId,
        status: "Completed",
      }),
      Project.countDocuments({
        createdBy: authUser.userId,
        status: "Pending",
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      count: projects.length,
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
        active: activeCount,
        completed: completedCount,
        pending: pendingCount,
      },
      projects,
    });
  } catch (error) {
    console.error("Fetch projects error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch projects." },
      { status: 500 }
    );
  }
}
