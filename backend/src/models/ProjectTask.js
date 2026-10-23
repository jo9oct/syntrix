import mongoose, { Schema } from "mongoose";

const projectTaskSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProject",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    taskType: {
      type: String,
      enum: ["development", "security_audit", "vulnerability_fix", "retest_verification"],
      default: "development",
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "done"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: {
      type: Date,
    },
    findingId: {
      type: Schema.Types.ObjectId,
      ref: "Finding",
      index: true,
    },
    comments: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        authorName: { type: String, required: true },
        authorRole: { type: String, required: true },
        message: { type: String, required: true },
        attachments: [
          {
            fileName: String,
            fileUrl: String,
          },
        ],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const ProjectTask = mongoose.model("ProjectTask", projectTaskSchema);

