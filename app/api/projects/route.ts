import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
try {
// 1. Connect to MongoDB
await connectDB();


// 2. Read the authentication cookie
const token = request.cookies.get("projectsphere_token")?.value;

if (!token) {
  return NextResponse.json(
    {
      success: false,
      message: "Please log in first.",
    },
    { status: 401 }
  );
}

// 3. Verify the JWT
const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error("JWT_SECRET is missing from environment variables.");

  return NextResponse.json(
    {
      success: false,
      message: "Server configuration error.",
    },
    { status: 500 }
  );
}

const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

// Support common JWT user ID field names
const userId = decoded.sub;

if (
  typeof userId !== "string" ||
  !mongoose.isValidObjectId(userId)
) {
  return NextResponse.json(
    {
      success: false,
      message: "Invalid login session.",
    },
    { status: 401 }
  );
}

// 4. Read and validate the request body
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

// 5. Validate the optional GitHub URL
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

// 6. Save the project to MongoDB
const project = await Project.create({
  title: title.trim(),
  description: description.trim(),
  category,
  deadline: parsedDeadline,
  githubUrl: validatedGithubUrl,
  createdBy: userId,
  // Status defaults to Pending in the Project model
});

// 7. Return the created project
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
// Handle expired or invalid JWTs
if (
error instanceof jwt.JsonWebTokenError ||
error instanceof jwt.TokenExpiredError
) {
return NextResponse.json(
{
success: false,
message: "Your session is invalid or expired. Please log in again.",
},
{ status: 401 }
);
}

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
// Connect to MongoDB
await connectDB();


// Verify the logged-in user
const token = request.cookies.get("projectsphere_token")?.value;

if (!token) {
  return NextResponse.json(
    { success: false, message: "Please log in first." },
    { status: 401 }
  );
}

const secret = process.env.JWT_SECRET;

if (!secret) {
  return NextResponse.json(
    { success: false, message: "Server configuration error." },
    { status: 500 }
  );
}

const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
const userId = decoded.sub;

if (
  typeof userId !== "string" ||
  !mongoose.isValidObjectId(userId)
) {
  return NextResponse.json(
    { success: false, message: "Invalid login session." },
    { status: 401 }
  );
}

// Fetch only this student's projects.
// Limit results to 20 to reduce database reads and response size.
const projects = await Project.find({ createdBy: userId })
  .select("title description category status deadline githubUrl createdAt")
  .sort({ createdAt: -1 })
  .limit(20)
  .lean();

return NextResponse.json({
  success: true,
  count: projects.length,
  projects,
});


} catch (error) {
if (
error instanceof jwt.JsonWebTokenError ||
error instanceof jwt.TokenExpiredError
) {
return NextResponse.json(
{
success: false,
message: "Your session is invalid or expired. Please log in again.",
},
{ status: 401 }
);
}

console.error("Fetch projects error:", error);

return NextResponse.json(
  { success: false, message: "Unable to fetch projects." },
  { status: 500 }
);


}
}

