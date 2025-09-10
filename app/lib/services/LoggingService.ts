import SubscriptionLog from '@/app/models/SubscriptionLog';
import PaymentInfo from '@/app/models/PaymentInfo';
import SubscriptionRecord from '@/app/models/SubscriptionRecord';
import { Types } from 'mongoose';

export interface LogSubscriptionParams {
  userId: string;
  subscriptionId?: string;
  action: 'created' | 'updated' | 'cancelled' | 'reactivated' | 'expired' | 'payment_failed' | 'payment_succeeded' | 'trial_started' | 'trial_ended';
  fromPlan?: 'free' | 'basic' | 'pro' | 'enterprise';
  toPlan?: 'free' | 'basic' | 'pro' | 'enterprise';
  stripeEventId?: string;
  stripeEventType?: string;
  amount?: number;
  currency?: string;
  status?: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface LogPaymentParams {
  userId: string;
  subscriptionId?: string;
  paymentIntentId?: string;
  invoiceId?: string;
  chargeId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  paymentMethod: {
    type: 'card' | 'bank_account' | 'paypal' | 'alipay' | 'wechat_pay';
    last4?: string;
    brand?: string;
    expMonth?: number;
    expYear?: number;
    country?: string;
  };
  billingDetails?: {
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
  description?: string;
  receiptUrl?: string;
  refundedAmount?: number;
  refundReason?: string;
  failureCode?: string;
  failureMessage?: string;
  metadata?: Record<string, any>;
  stripeData?: Record<string, any>;
  paidAt?: Date;
  refundedAt?: Date;
}

export interface LogSubscriptionRecordParams {
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  endedAt?: Date;
  priceId: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  quantity?: number;
  metadata?: Record<string, any>;
  stripeData?: Record<string, any>;
}

export class LoggingService {
  /**
   * 记录订阅操作日志
   */
  static async logSubscription(params: LogSubscriptionParams): Promise<void> {
    try {
      await SubscriptionLog.create({
        userId: new Types.ObjectId(params.userId),
        subscriptionId: params.subscriptionId,
        action: params.action,
        fromPlan: params.fromPlan,
        toPlan: params.toPlan,
        stripeEventId: params.stripeEventId,
        stripeEventType: params.stripeEventType,
        amount: params.amount,
        currency: params.currency || 'usd',
        status: params.status || 'success',
        errorMessage: params.errorMessage,
        metadata: params.metadata || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    } catch (error) {
      console.error('Failed to log subscription action:', error);
      // 不抛出错误，避免影响主业务流程
    }
  }

  /**
   * 记录支付信息
   */
  static async logPayment(params: LogPaymentParams): Promise<void> {
    try {
      await PaymentInfo.create({
        userId: new Types.ObjectId(params.userId),
        subscriptionId: params.subscriptionId,
        paymentIntentId: params.paymentIntentId,
        invoiceId: params.invoiceId,
        chargeId: params.chargeId,
        amount: params.amount,
        currency: params.currency,
        status: params.status,
        paymentMethod: params.paymentMethod,
        billingDetails: params.billingDetails || {},
        description: params.description,
        receiptUrl: params.receiptUrl,
        refundedAmount: params.refundedAmount,
        refundReason: params.refundReason,
        failureCode: params.failureCode,
        failureMessage: params.failureMessage,
        metadata: params.metadata || {},
        stripeData: params.stripeData || {},
        paidAt: params.paidAt,
        refundedAt: params.refundedAt,
      });
    } catch (error) {
      console.error('Failed to log payment info:', error);
      // 不抛出错误，避免影响主业务流程
    }
  }

  /**
   * 记录订阅记录
   */
  static async logSubscriptionRecord(params: LogSubscriptionRecordParams): Promise<void> {
    try {
      // 检查是否是计划变更
      const isPlanChange = params.metadata?.planChange === true;
      
      if (isPlanChange) {
        // 计划变更时，总是创建新记录
        console.log(`📝 计划变更，创建新的订阅记录: ${params.metadata?.oldPlan} -> ${params.plan}`);
        await SubscriptionRecord.create({
          userId: new Types.ObjectId(params.userId),
          stripeSubscriptionId: params.stripeSubscriptionId,
          stripeCustomerId: params.stripeCustomerId,
          plan: params.plan,
          status: params.status,
          currentPeriodStart: params.currentPeriodStart,
          currentPeriodEnd: params.currentPeriodEnd,
          trialStart: params.trialStart,
          trialEnd: params.trialEnd,
          cancelAtPeriodEnd: params.cancelAtPeriodEnd || false,
          canceledAt: params.canceledAt,
          endedAt: params.endedAt,
          priceId: params.priceId,
          amount: params.amount,
          currency: params.currency,
          interval: params.interval,
          intervalCount: params.intervalCount || 1,
          quantity: params.quantity || 1,
          metadata: params.metadata || {},
          stripeData: params.stripeData || {},
          lastSyncedAt: new Date(),
        });
      } else {
        // 非计划变更时，检查是否已存在相同的订阅记录
        const existingRecord = await SubscriptionRecord.findOne({
          stripeSubscriptionId: params.stripeSubscriptionId
        });

        if (existingRecord) {
          // 更新现有记录
          await SubscriptionRecord.findByIdAndUpdate(existingRecord._id, {
            ...params,
            lastSyncedAt: new Date(),
          });
        } else {
          // 创建新记录
          await SubscriptionRecord.create({
            userId: new Types.ObjectId(params.userId),
            stripeSubscriptionId: params.stripeSubscriptionId,
            stripeCustomerId: params.stripeCustomerId,
            plan: params.plan,
            status: params.status,
            currentPeriodStart: params.currentPeriodStart,
            currentPeriodEnd: params.currentPeriodEnd,
            trialStart: params.trialStart,
            trialEnd: params.trialEnd,
            cancelAtPeriodEnd: params.cancelAtPeriodEnd || false,
            canceledAt: params.canceledAt,
            endedAt: params.endedAt,
            priceId: params.priceId,
            amount: params.amount,
            currency: params.currency,
            interval: params.interval,
            intervalCount: params.intervalCount || 1,
            quantity: params.quantity || 1,
            metadata: params.metadata || {},
            stripeData: params.stripeData || {},
            lastSyncedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Failed to log subscription record:', error);
      // 不抛出错误，避免影响主业务流程
    }
  }

  /**
   * 获取用户订阅日志
   */
  static async getUserSubscriptionLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      return await SubscriptionLog.find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();
    } catch (error) {
      console.error('Failed to get user subscription logs:', error);
      return [];
    }
  }

  /**
   * 获取用户支付历史
   */
  static async getUserPaymentHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      return await PaymentInfo.find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();
    } catch (error) {
      console.error('Failed to get user payment history:', error);
      return [];
    }
  }

  /**
   * 获取用户订阅记录
   */
  static async getUserSubscriptionRecords(userId: string): Promise<any[]> {
    try {
      return await SubscriptionRecord.find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      console.error('Failed to get user subscription records:', error);
      return [];
    }
  }

  /**
   * 获取订阅统计信息
   */
  static async getSubscriptionStats(userId: string): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalAmount: number;
    lastPaymentDate?: Date;
  }> {
    try {
      const [subscriptionCount, activeCount, paymentStats] = await Promise.all([
        SubscriptionRecord.countDocuments({ userId: new Types.ObjectId(userId) }),
        SubscriptionRecord.countDocuments({ 
          userId: new Types.ObjectId(userId),
          status: { $in: ['active', 'trialing'] }
        }),
        PaymentInfo.aggregate([
          { $match: { userId: new Types.ObjectId(userId), status: 'succeeded' } },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              lastPaymentDate: { $max: '$paidAt' }
            }
          }
        ])
      ]);

      return {
        totalSubscriptions: subscriptionCount,
        activeSubscriptions: activeCount,
        totalAmount: paymentStats[0]?.totalAmount || 0,
        lastPaymentDate: paymentStats[0]?.lastPaymentDate,
      };
    } catch (error) {
      console.error('Failed to get subscription stats:', error);
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalAmount: 0,
      };
    }
  }
}

