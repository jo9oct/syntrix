import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    serviceType: {
      type: String,
      enum: ["web_app", "api", "malware"],
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },

    riskSummary: {
      critical: {
        type: Number,
        default: 0,
      },
      high: {
        type: Number,
        default: 0,
      },
      medium: {
        type: Number,
        default: 0,
      },
      low: {
        type: Number,
        default: 0,
      },
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const Project = mongoose.model("Project", projectSchema);
