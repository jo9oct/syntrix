import mongoose, { Document, Schema } from 'mongoose';

export interface IFinding extends Document {
  title: string;
  findingType?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  description: string;
  affectedAsset?: string;
  affectedEndpoint?: string;
  evidence?: string;
  impact?: string;
  recommendation?: string;
  commitRef?: string;
  remediationNotes?: string;
  status: 'open' | 'in_progress' | 'ready_for_retest' | 'fixed' | 'reopened' | 'accepted_risk' | 'closed';
  assignedDeveloper?: mongoose.Types.ObjectId;
  assessmentId?: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const findingSchema = new Schema<IFinding>({
  title: { type: String, required: true },
  findingType: { type: String },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'informational'],
    required: true
  },
  description: { type: String, required: true },
  affectedAsset: { type: String },
  affectedEndpoint: { type: String },
  evidence: { type: String },
  impact: { type: String },
  recommendation: { type: String },
  commitRef: { type: String },
  remediationNotes: { type: String },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'ready_for_retest', 'fixed', 'reopened', 'accepted_risk', 'closed'],
    default: 'open'
  },
  assignedDeveloper: { type: Schema.Types.ObjectId, ref: 'User' },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment' },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true }
}, { timestamps: true });

export const Finding = mongoose.model<IFinding>('Finding', findingSchema);
