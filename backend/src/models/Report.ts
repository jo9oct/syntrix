import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  title: string;
  type: 'security_assessment' | 'malware' | 'verification' | 'executive';
  projectId: mongoose.Types.ObjectId;
  assessmentId?: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  generatedBy: mongoose.Types.ObjectId;
  status: 'draft' | 'final';
  executiveName?: string;
  filePath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>({
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['security_assessment', 'malware', 'verification', 'executive'],
    required: true
  },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment' },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'final'], default: 'draft' },
  executiveName: { type: String },
  filePath: { type: String }
}, { timestamps: true });

export const Report = mongoose.model<IReport>('Report', reportSchema);
