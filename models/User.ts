import mongoose, { Schema, models, model } from "mongoose";

export type UserRole = "student" | "faculty" | "admin";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "faculty", "admin"],
      default: "student",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const User =
  models.User || model<IUser>("User", UserSchema);

export default User;