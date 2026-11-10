import mongoose, { Schema, models, model } from "mongoose";

export interface INotification {
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId | null;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "PROJECT_SUBMITTED",
        "PROJECT_APPROVED",
        "PROJECT_REJECTED",
        "PROJECT_FEEDBACK",
        "ROLE_UPDATED",
        "TEAM_INVITATION",
        "TEAM_JOINED",
        "SYSTEM",
      ],
      default: "SYSTEM",
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    link: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification =
  models.Notification ||
  model<INotification>("Notification", NotificationSchema);

export default Notification;
