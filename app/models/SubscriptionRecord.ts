import mongoose, { Document, Types } from 'mongoose';

export interface ISubscriptionRecordDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  stripeSubscriptionId: string; // Stripe subscription ID
  stripeCustomerId: string; // Stripe customer ID
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  endedAt?: Date;
  priceId: string; // Stripe price ID
  amount: number; // 金额（分）
  currency: string; // 货币
  interval: 'day' | 'week' | 'month' | 'year'; // 计费周期
  intervalCount: number; // 间隔数量
  quantity: number; // 数量
  metadata?: Record<string, any>; // 额外元数据
  stripeData?: Record<string, any>; // Stripe原始数据
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date; // 最后同步时间
}

const subscriptionRecordSchema = new mongoose.Schema<ISubscriptionRecordDocument>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  stripeCustomerId: {
    type: String,
    required: true,
    index: true,
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'],
    required: true,
    index: true,
  },
  currentPeriodStart: {
    type: Date,
    required: true,
  },
  currentPeriodEnd: {
    type: Date,
    required: true,
  },
  trialStart: Date,
  trialEnd: Date,
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false,
  },
  canceledAt: Date,
  endedAt: Date,
  priceId: {
    type: String,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    default: 'usd',
    uppercase: true,
  },
  interval: {
    type: String,
    enum: ['day', 'week', 'month', 'year'],
    required: true,
  },
  intervalCount: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  stripeData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
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
  lastSyncedAt: {
    type: Date,
  },
});

// 更新 updatedAt 时间戳
subscriptionRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 复合索引优化查询
subscriptionRecordSchema.index({ userId: 1, status: 1, createdAt: -1 });
subscriptionRecordSchema.index({ stripeCustomerId: 1, status: 1 });
subscriptionRecordSchema.index({ plan: 1, status: 1 });
subscriptionRecordSchema.index({ currentPeriodEnd: 1, status: 1 });
subscriptionRecordSchema.index({ trialEnd: 1, status: 1 });
subscriptionRecordSchema.index({ lastSyncedAt: 1 });

export default mongoose.models.SubscriptionRecord as mongoose.Model<ISubscriptionRecordDocument> || 
  mongoose.model<ISubscriptionRecordDocument>('SubscriptionRecord', subscriptionRecordSchema);


