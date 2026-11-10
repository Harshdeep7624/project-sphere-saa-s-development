import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import Team from "@/models/Team";
import "@/models/User";
import { verifyUserSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { notifyFacultyAndAdmins } from "@/lib/notifications";

export const runtime = "nodejs";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyUserSession(request);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: authError?.message || "Please log in first.",
        },
        { status: authError?.status || 401 }
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
      teamId,
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

    // Optional team association verification
    let validatedTeamId: mongoose.Types.ObjectId | null = null;
    if (teamId && typeof teamId === "string" && mongoose.isValidObjectId(teamId)) {
      const targetTeam = await Team.findOne({
        _id: teamId,
        $or: [{ owner: user.userId }, { "members.user": user.userId }],
      });
      if (targetTeam) {
        validatedTeamId = targetTeam._id;
      }
    }

    // 5. Save the project to MongoDB, bound to the authenticated user
    const project = await Project.create({
      title: title.trim(),
      description: description.trim(),
      category,
      deadline: parsedDeadline,
      githubUrl: validatedGithubUrl,
      createdBy: user.userId,
      teamId: validatedTeamId,
      // Status defaults to Pending in the Project model
    });

    if (validatedTeamId) {
      await Team.findByIdAndUpdate(validatedTeamId, {
        $addToSet: { projects: project._id },
      });
    }

    // Reliably log audit and notify faculty/admins before returning response
    await recordAuditLog(
      {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "PROJECT_CREATED",
      "Project",
      project._id.toString(),
      { title: project.title, category: project.category }
    );

    await notifyFacultyAndAdmins({
      senderId: user.userId,
      type: "PROJECT_SUBMITTED",
      title: "New Project Submitted",
      message: `${user.name} submitted a new project "${project.title}" for review.`,
      link: "/?tab=review-queue",
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

    // Check user team memberships to allow collaborative access to shared projects
    const userTeams = await Team.find({
      $or: [{ owner: user.userId }, { "members.user": user.userId }],
    }).select("_id").lean();
    const userTeamIds = userTeams.map((t) => t._id);

    // Build filter query for search and filtering across all accessible records
    const baseAccessFilter = userTeamIds.length > 0
      ? { $or: [{ createdBy: user.userId }, { teamId: { $in: userTeamIds } }] }
      : { createdBy: user.userId };

    const andConditions: Record<string, unknown>[] = [baseAccessFilter];

    if (searchParam && searchParam.trim()) {
      const escaped = searchParam.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      andConditions.push({
        $or: [
          { title: regex },
          { description: regex },
          { category: regex },
          { status: regex },
        ],
      });
    }

    if (categoryParam && categoryParam.trim() && categoryParam !== "All categories") {
      andConditions.push({ category: categoryParam.trim() });
    }

    if (statusParam && statusParam.trim() && statusParam !== "All statuses") {
      andConditions.push({ status: statusParam.trim() });
    }

    const filterQuery: Record<string, unknown> =
      andConditions.length === 1 ? baseAccessFilter : { $and: andConditions };

    const skip = (page - 1) * limit;

    // Fetch filtered count, paginated projects, and global statistics in parallel
    const [total, projects, totalAll, activeCount, completedCount, pendingCount] = await Promise.all([
      Project.countDocuments(filterQuery),
      Project.find(filterQuery)
        .select("title description category status deadline githubUrl createdAt reviewNotes reviewedBy reviewedAt createdBy teamId")
        .populate("reviewedBy", "name")
        .populate("createdBy", "name email")
        .populate("teamId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments({ createdBy: user.userId }),
      Project.countDocuments({
        createdBy: user.userId,
        status: { $in: ["In Progress", "Approved"] },
      }),
      Project.countDocuments({
        createdBy: user.userId,
        status: "Completed",
      }),
      Project.countDocuments({
        createdBy: user.userId,
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
