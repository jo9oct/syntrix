import mongoose, { Schema } from "mongoose";

const auditLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    resource: {
      type: String,
      required: true,
    },

    resourceId: {
      type: String,
    },

    details: {
      type: Schema.Types.Mixed,
    },

    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
