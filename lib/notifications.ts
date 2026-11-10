import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";

export interface CreateNotificationParams {
  recipientId: string | mongoose.Types.ObjectId;
  senderId?: string | mongoose.Types.ObjectId | null;
  type:
    | "PROJECT_SUBMITTED"
    | "PROJECT_APPROVED"
    | "PROJECT_REJECTED"
    | "PROJECT_FEEDBACK"
    | "ROLE_UPDATED"
    | "TEAM_INVITATION"
    | "TEAM_JOINED"
    | "SYSTEM";
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    await connectDB();

    // Prevent avoidable duplicate unread notifications for the same event
    const existingUnread = await Notification.findOne({
      recipient: params.recipientId,
      type: params.type,
      title: params.title.slice(0, 150),
      read: false,
    });

    if (existingUnread) {
      existingUnread.message = params.message.slice(0, 1000);
      existingUnread.link = params.link || "";
      existingUnread.sender = params.senderId || null;
      await existingUnread.save();
      return;
    }

    await Notification.create({
      recipient: params.recipientId,
      sender: params.senderId || null,
      type: params.type,
      title: params.title.slice(0, 150),
      message: params.message.slice(0, 1000),
      link: params.link || "",
      read: false,
    });
  } catch (error) {
    console.error("Create notification error:", error);
  }
}

/**
 * Notifies all active faculty and administrator users about an event (e.g. a new project submission).
 * Prevents spamming duplicate unread notifications to reviewers who already have an unread item for the event.
 */
export async function notifyFacultyAndAdmins(
  params: Omit<CreateNotificationParams, "recipientId">
): Promise<void> {
  try {
    await connectDB();
    const facultyAndAdmins = await User.find({
      role: { $in: ["faculty", "admin"] },
      isActive: { $ne: false },
    })
      .select("_id")
      .lean();

    if (facultyAndAdmins.length === 0) return;

    // Filter out users who already have an unread notification for this exact event
    const existingUnreadRecipients = await Notification.find({
      recipient: { $in: facultyAndAdmins.map((u) => u._id) },
      type: params.type,
      title: params.title.slice(0, 150),
      read: false,
    }).distinct("recipient");

    const existingRecipientSet = new Set(
      existingUnreadRecipients.map((id) => id.toString())
    );

    const targetUsers = facultyAndAdmins.filter(
      (u) => !existingRecipientSet.has(u._id.toString())
    );

    if (targetUsers.length === 0) return;

    const docs = targetUsers.map((u) => ({
      recipient: u._id,
      sender: params.senderId || null,
      type: params.type,
      title: params.title.slice(0, 150),
      message: params.message.slice(0, 1000),
      link: params.link || "",
      read: false,
    }));

    await Notification.insertMany(docs);
  } catch (error) {
    console.error("Notify faculty & admins error:", error);
  }
}
