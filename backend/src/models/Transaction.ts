import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  userId?: mongoose.Types.ObjectId;
  tx_ref: string;
  amount: number;
  currency: string;
  tier: 'free' | 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  status: 'pending' | 'success' | 'failed';
  paymentMethod?: string;
  chapaReference?: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  checkoutUrl?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  tx_ref: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'ETB' },
  tier: { type: String, enum: ['free', 'pro', 'enterprise'], required: true },
  billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  paymentMethod: { type: String },
  chapaReference: { type: String },
  customerEmail: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String },
  checkoutUrl: { type: String },
  verifiedAt: { type: Date }
}, { timestamps: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
