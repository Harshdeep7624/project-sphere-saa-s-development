import connectDB from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";

export interface AuditActor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function recordAuditLog(
  actor: AuditActor,
  action: string,
  targetEntity: string,
  targetId: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actor: {
        id: String(actor.id),
        name: actor.name || "Unknown",
        email: actor.email || "",
        role: actor.role || "user",
      },
      action,
      targetEntity,
      targetId: String(targetId),
      details,
    });
  } catch (error) {
    // Non-blocking: never crash the parent transaction if audit writing fails
    console.error("Audit log recording error:", error);
  }
}
