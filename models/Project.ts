import mongoose, { Schema, models, model } from "mongoose";

const ProjectSchema = new Schema(
{
title: {
type: String,
required: [true, "Project title is required"],
trim: true,
minlength: 3,
maxlength: 100,
},


description: {
  type: String,
  required: [true, "Project description is required"],
  trim: true,
  maxlength: 2000,
},

category: {
  type: String,
  required: true,
  enum: [
    "Web Development",
    "AI/ML",
    "Data Science",
    "Mobile App",
    "Other",
  ],
},

status: {
  type: String,
  enum: ["Pending", "Approved", "Rejected", "In Progress", "Completed"],
  default: "Pending",
},

createdBy: {
  type: Schema.Types.ObjectId,
  ref: "User",
  required: true,
},

deadline: {
  type: Date,
  required: true,
},

githubUrl: {
  type: String,
  default: "",
  trim: true,
},


},
{ timestamps: true }
);

// Supports listing a user's projects by creation date.
ProjectSchema.index({ createdBy: 1, createdAt: -1 });

// Supports filtering projects by status and sorting by creation date.
ProjectSchema.index({ status: 1, createdAt: -1 });

const Project =
  models.Project || model("Project", ProjectSchema);

export default Project;
