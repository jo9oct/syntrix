import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;
  serviceType: 'web_app' | 'api' | 'malware';
  status: 'active' | 'completed' | 'archived';
  riskSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  serviceType: { type: String, enum: ['web_app', 'api', 'malware'], required: true },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  riskSummary: {
    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 }
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const Project = mongoose.model<IProject>('Project', projectSchema);
