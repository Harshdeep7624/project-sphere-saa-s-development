import mongoose, { Schema, models, model } from "mongoose";

export type InvitationStatus = "pending" | "accepted" | "rejected" | "canceled";

export interface ITeamInvitation {
  team: mongoose.Types.ObjectId;
  teamName: string;
  inviter: mongoose.Types.ObjectId;
  inviteeEmail: string;
  invitee?: mongoose.Types.ObjectId | null;
  role: "member" | "admin";
  status: InvitationStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const TeamInvitationSchema = new Schema<ITeamInvitation>(
  {
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    teamName: {
      type: String,
      required: true,
      trim: true,
    },
    inviter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteeEmail: {
      type: String,
      required: [true, "Invitee email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    invitee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "canceled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Unique partial index: exactly one pending invitation per team and inviteeEmail
TeamInvitationSchema.index(
  { team: 1, inviteeEmail: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);
TeamInvitationSchema.index({ inviteeEmail: 1, status: 1, createdAt: -1 });

const TeamInvitation =
  models.TeamInvitation ||
  model<ITeamInvitation>("TeamInvitation", TeamInvitationSchema);

export default TeamInvitation;
