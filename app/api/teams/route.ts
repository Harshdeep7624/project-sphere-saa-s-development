import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Team from "@/models/Team";
import "@/models/User";
import "@/models/Project";
import { verifyUserSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyUserSession(request);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: authError?.message || "Please log in first." },
        { status: authError?.status || 401 }
      );
    }

    await connectDB();

    const teams = await Team.find({
      $or: [{ owner: user.userId }, { "members.user": user.userId }],
    })
      .populate("owner", "name email role")
      .populate("members.user", "name email role")
      .populate("projects", "title category status deadline")
      .sort({ createdAt: -1 })
      .lean();

    const formattedTeams = teams.map((team) => {
      const ownerObj = team.owner as unknown as { _id?: unknown; name?: string; email?: string } | null;
      const isOwner = team.owner?.toString() === user.userId || ownerObj?._id?.toString() === user.userId;

      const formattedMembers = (team.members || []).map(
        (m: { user?: unknown; role?: string; joinedAt?: Date }) => {
          const memberUser = m.user as unknown as { _id?: unknown; name?: string; email?: string; role?: string } | null;
          return {
            id: memberUser?._id ? memberUser._id.toString() : "",
            name: memberUser?.name || "Unknown User",
            email: memberUser?.email || "",
            userRole: memberUser?.role || "student",
            teamRole: m.role || "member",
            joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : null,
            isCurrentUser: memberUser?._id?.toString() === user.userId,
          };
        }
      );

      const formattedProjects = (team.projects || []).map((p: unknown) => {
        const proj = p as unknown as { _id?: unknown; title?: string; category?: string; status?: string; deadline?: string } | null;
        return {
          id: proj?._id ? proj._id.toString() : "",
          title: proj?.title || "",
          category: proj?.category || "",
          status: proj?.status || "Pending",
          deadline: proj?.deadline || "",
        };
      });

      return {
        id: team._id.toString(),
        name: team.name,
        description: team.description || "",
        owner: {
          id: ownerObj?._id ? ownerObj._id.toString() : "",
          name: ownerObj?.name || "",
          email: ownerObj?.email || "",
        },
        isOwner,
        membersCount: formattedMembers.length,
        projectsCount: formattedProjects.length,
        members: formattedMembers,
        projects: formattedProjects,
        createdAt: team.createdAt ? new Date(team.createdAt).toISOString() : null,
        updatedAt: team.updatedAt ? new Date(team.updatedAt).toISOString() : null,
      };
    });

    return NextResponse.json({
      success: true,
      teams: formattedTeams,
    });
  } catch (error) {
    console.error("Fetch teams error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load teams." },
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

    const { name, description } = (body || {}) as Record<string, unknown>;

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Team name must be between 2 and 100 characters.",
        },
        { status: 400 }
      );
    }

    let validatedDescription = "";
    if (description !== undefined && description !== null && description !== "") {
      if (typeof description !== "string") {
        return NextResponse.json(
          { success: false, message: "Description must be text." },
          { status: 400 }
        );
      }
      if (description.trim().length > 500) {
        return NextResponse.json(
          {
            success: false,
            message: "Description cannot exceed 500 characters.",
          },
          { status: 400 }
        );
      }
      validatedDescription = description.trim();
    }

    await connectDB();

    const team = await Team.create({
      name: name.trim(),
      description: validatedDescription,
      owner: user.userId,
      members: [
        {
          user: user.userId,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
      projects: [],
    });

    await recordAuditLog(
      {
        id: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      "TEAM_CREATED",
      "Team",
      team._id.toString(),
      { name: team.name }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Team created successfully!",
        team: {
          id: team._id.toString(),
          name: team.name,
          description: team.description,
          owner: {
            id: user.userId,
            name: user.name,
            email: user.email,
          },
          isOwner: true,
          membersCount: 1,
          projectsCount: 0,
          members: [
            {
              id: user.userId,
              name: user.name,
              email: user.email,
              userRole: user.role,
              teamRole: "owner",
              isCurrentUser: true,
            },
          ],
          projects: [],
          createdAt: team.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create team error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to create team." },
      { status: 500 }
    );
  }
}
