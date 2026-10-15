import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  members: Array<{
    userId: mongoose.Types.ObjectId;
    role: string;
    joinedAt: Date;
  }>;
  isActive: boolean;
  createdAt: Date;
}

const organizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },
    joinedAt: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);
