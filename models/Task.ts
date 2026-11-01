import mongoose, { Schema, models, model, Types } from "mongoose";

export type TaskCategory =
  | "General"
  | "Planning"
  | "Research"
  | "Documentation"
  | "Development"
  | "Submission"
  | "Other";

export type TaskPriority = "Low" | "Medium" | "High";

export type TaskStatus = "Pending" | "In Progress" | "Completed";

export interface ITask {
  _id?: Types.ObjectId;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [3, "Task title must be at least 3 characters"],
      maxlength: [120, "Task title cannot exceed 120 characters"],
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    category: {
      type: String,
      enum: {
        values: [
          "General",
          "Planning",
          "Research",
          "Documentation",
          "Development",
          "Submission",
          "Other",
        ],
        message: "{VALUE} is not a valid task category",
      },
      default: "General",
      required: true,
    },
    priority: {
      type: String,
      enum: {
        values: ["Low", "Medium", "High"],
        message: "{VALUE} is not a valid task priority",
      },
      default: "Medium",
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ["Pending", "In Progress", "Completed"],
        message: "{VALUE} is not a valid task status",
      },
      default: "Pending",
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, "Task due date is required"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Task must belong to a user"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ createdBy: 1, dueDate: 1 });

const Task = models.Task || model<ITask>("Task", TaskSchema);

export default Task;
