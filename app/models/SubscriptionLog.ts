import mongoose, { Document, Types } from 'mongoose';

export interface ISubscriptionLogDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  subscriptionId?: string; // Stripe subscription ID
  action: 'created' | 'updated' | 'cancelled' | 'reactivated' | 'expired' | 'payment_failed' | 'payment_succeeded' | 'trial_started' | 'trial_ended';
  fromPlan?: 'free' | 'basic' | 'pro' | 'enterprise';
  toPlan?: 'free' | 'basic' | 'pro' | 'enterprise';
  stripeEventId?: string; // Stripe webhook event ID
  stripeEventType?: string; // Stripe event type
  amount?: number; // 金额（分）
  currency?: string; // 货币
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string; // 错误信息
  metadata?: Record<string, any>; // 额外元数据
  ipAddress?: string; // 操作IP地址
  userAgent?: string; // 用户代理
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionLogSchema = new mongoose.Schema<ISubscriptionLogDocument>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  subscriptionId: {
    type: String,
    index: true,
  },
  action: {
    type: String,
    enum: ['created', 'updated', 'cancelled', 'reactivated', 'expired', 'payment_failed', 'payment_succeeded', 'trial_started', 'trial_ended'],
    required: true,
    index: true,
  },
  fromPlan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
  },
  toPlan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
  },
  stripeEventId: {
    type: String,
    sparse: true, // 允许null值但确保唯一性
  },
  stripeEventType: {
    type: String,
  },
  amount: {
    type: Number, // 以分为单位存储
  },
  currency: {
    type: String,
    default: 'usd',
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    required: true,
    default: 'success',
    index: true,
  },
  errorMessage: {
    type: String,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 更新 updatedAt 时间戳
subscriptionLogSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 复合索引优化查询
subscriptionLogSchema.index({ userId: 1, action: 1, createdAt: -1 });
subscriptionLogSchema.index({ subscriptionId: 1, createdAt: -1 });
subscriptionLogSchema.index({ stripeEventId: 1 }, { unique: true, sparse: true });
subscriptionLogSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.SubscriptionLog as mongoose.Model<ISubscriptionLogDocument> || 
  mongoose.model<ISubscriptionLogDocument>('SubscriptionLog', subscriptionLogSchema);

