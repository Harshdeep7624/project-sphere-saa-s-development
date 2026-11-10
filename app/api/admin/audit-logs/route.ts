import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getCurrentUser, verifyAdmin } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";

export const runtime = "nodejs";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

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

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10)
    );
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)
      )
    );
    const skip = (page - 1) * limit;

    const actionParam = searchParams.get("action")?.trim();
    const entityParam = searchParams.get("targetEntity")?.trim();
    const searchParam = searchParams.get("search")?.trim();

    const query: Record<string, unknown> = {};

    if (actionParam && actionParam !== "All") {
      query.action = actionParam;
    }

    if (entityParam && entityParam !== "All") {
      query.targetEntity = entityParam;
    }

    if (searchParam) {
      const escaped = searchParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { "actor.name": { $regex: escaped, $options: "i" } },
        { "actor.email": { $regex: escaped, $options: "i" } },
        { action: { $regex: escaped, $options: "i" } },
      ];
    }

    await connectDB();

    const [total, rawLogs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const logs = rawLogs.map((log) => ({
      id: log._id.toString(),
      actor: log.actor,
      action: log.action,
      targetEntity: log.targetEntity,
      targetId: log.targetId,
      details: log.details || {},
      createdAt: log.createdAt,
    }));

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Fetch audit logs error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve audit logs." },
      { status: 500 }
    );
  }
}
