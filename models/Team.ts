import mongoose, { Schema, models, model } from "mongoose";

export type TeamMemberRole = "owner" | "admin" | "member";

export interface ITeamMember {
  user: mongoose.Types.ObjectId;
  role: TeamMemberRole;
  joinedAt: Date;
}

export interface ITeam {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  members: ITeamMember[];
  projects: mongoose.Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const TeamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
      minlength: [2, "Team name must be at least 2 characters"],
      maxlength: [100, "Team name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: {
      type: [TeamMemberSchema],
      default: [],
    },
    projects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
  },
  { timestamps: true }
);

TeamSchema.index({ "members.user": 1 });
TeamSchema.index({ owner: 1, createdAt: -1 });

const Team = models.Team || model<ITeam>("Team", TeamSchema);

export default Team;
