import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const scopeSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },

    hostnames: {
      type: [String],
      required: true,
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length > 0 &&
            value.length <= 100 &&
            value.every(
              (hostname) =>
                typeof hostname === "string" &&
                hostname.length > 0 &&
                hostname.length <= 253 &&
                hostname === hostname.toLowerCase() &&
                !hostname.endsWith(".") &&
                !hostname.includes("*") &&
                !hostname.includes("/") &&
                !hostname.includes(":") &&
                !/\s/.test(hostname),
            ) &&
            new Set(value).size === value.length
          );
        },
        message: "Hostnames must be normalized and unique.",
      },
    },

    ports: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length > 0 &&
            value.length <= 100 &&
            value.every(
              (port) => Number.isInteger(port) && port >= 1 && port <= 65535,
            ) &&
            new Set(value).size === value.length
          );
        },
        message: "Ports must be unique integers between 1 and 65535.",
      },
    },

    includeSubdomains: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Scope names are unique per owner.
scopeSchema.index(
  { ownerId: 1, name: 1 },
  { unique: true, name: "unique_scope_name_per_owner" },
);

scopeSchema.index({ ownerId: 1, createdAt: -1 });

const Scope = models.Scope || model("Scope", scopeSchema);

export default Scope;
