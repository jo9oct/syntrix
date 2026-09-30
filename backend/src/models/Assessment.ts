import mongoose, { Document, Schema } from 'mongoose';

export interface IAssessment extends Document {
  projectId: mongoose.Types.ObjectId;
  targetType: 'web_app' | 'api' | 'both';
  targetUrl: string;
  environment: 'development' | 'staging' | 'production';
  scanMode: 'specific' | 'full';
  selectedTests: string[];
  intensity: 'light' | 'standard' | 'deep';
  authConfig?: { type: string; credential: string };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalTests: number;
  completedTests: number;
  findings: mongoose.Types.ObjectId[];
  startedAt?: Date;
  completedAt?: Date;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const assessmentSchema = new Schema<IAssessment>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  targetType: { type: String, enum: ['web_app', 'api', 'both'], required: true },
  targetUrl: { type: String, required: true },
  environment: { type: String, enum: ['development', 'staging', 'production'], required: true },
  scanMode: { type: String, enum: ['specific', 'full'], default: 'full' },
  selectedTests: [{ type: String }],
  intensity: { type: String, enum: ['light', 'standard', 'deep'], default: 'standard' },
  authConfig: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'], default: 'pending' },
  progress: { type: Number, default: 0 },
  totalTests: { type: Number, default: 0 },
  completedTests: { type: Number, default: 0 },
  findings: [{ type: Schema.Types.ObjectId, ref: 'Finding' }],
  startedAt: { type: Date },
  completedAt: { type: Date },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const Assessment = mongoose.model<IAssessment>('Assessment', assessmentSchema);
