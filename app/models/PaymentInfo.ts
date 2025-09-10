import mongoose, { Document, Types } from 'mongoose';

export interface IPaymentInfoDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  subscriptionId?: string; // Stripe subscription ID
  paymentIntentId?: string; // Stripe payment intent ID
  invoiceId?: string; // Stripe invoice ID
  chargeId?: string; // Stripe charge ID
  amount: number; // 金额（分）
  currency: string; // 货币
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  paymentMethod: {
    type: 'card' | 'bank_account' | 'paypal' | 'alipay' | 'wechat_pay';
    last4?: string; // 卡号后四位
    brand?: string; // 卡品牌 (visa, mastercard, etc.)
    expMonth?: number; // 过期月份
    expYear?: number; // 过期年份
    country?: string; // 发卡国家
  };
  billingDetails: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  description?: string; // 支付描述
  receiptUrl?: string; // 收据URL
  refundedAmount?: number; // 退款金额（分）
  refundReason?: string; // 退款原因
  failureCode?: string; // 失败代码
  failureMessage?: string; // 失败信息
  metadata?: Record<string, any>; // 额外元数据
  stripeData?: Record<string, any>; // Stripe原始数据
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date; // 支付完成时间
  refundedAt?: Date; // 退款时间
}

const paymentInfoSchema = new mongoose.Schema<IPaymentInfoDocument>({
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
  paymentIntentId: {
    type: String,
    sparse: true,
  },
  invoiceId: {
    type: String,
  },
  chargeId: {
    type: String,
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
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    required: true,
    default: 'pending',
    index: true,
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'bank_account', 'paypal', 'alipay', 'wechat_pay'],
      required: true,
    },
    last4: String,
    brand: String,
    expMonth: Number,
    expYear: Number,
    country: String,
  },
  billingDetails: {
    name: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
  },
  description: String,
  receiptUrl: String,
  refundedAmount: {
    type: Number,
    min: 0,
  },
  refundReason: {
    type: String,
    enum: ['duplicate', 'fraudulent', 'requested_by_customer', 'other'],
  },
  failureCode: String,
  failureMessage: String,
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
  paidAt: Date,
  refundedAt: Date,
});

// 更新 updatedAt 时间戳
paymentInfoSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 复合索引优化查询
paymentInfoSchema.index({ userId: 1, status: 1, createdAt: -1 });
paymentInfoSchema.index({ subscriptionId: 1, createdAt: -1 });
paymentInfoSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });
paymentInfoSchema.index({ invoiceId: 1 });
paymentInfoSchema.index({ chargeId: 1 });
paymentInfoSchema.index({ status: 1, createdAt: -1 });
paymentInfoSchema.index({ amount: 1, createdAt: -1 });

export default mongoose.models.PaymentInfo as mongoose.Model<IPaymentInfoDocument> || 
  mongoose.model<IPaymentInfoDocument>('PaymentInfo', paymentInfoSchema);

