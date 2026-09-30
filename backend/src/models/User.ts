import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'client_owner' | 'client_member' | 'security_engineer' | 'developer' | 'malware_analyst';
  organizationId?: mongoose.Types.ObjectId;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'trial' | 'canceled';
  subscriptionExpiresAt?: Date;
  chapaCustomerRef?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  role: { 
    type: String, 
    enum: ['admin', 'client_owner', 'client_member', 'security_engineer', 'developer', 'malware_analyst'],
    default: 'client_member'
  },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },
  subscriptionTier: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'trial', 'canceled'],
    default: 'active'
  },
  subscriptionExpiresAt: { type: Date },
  chapaCustomerRef: { type: String },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);
