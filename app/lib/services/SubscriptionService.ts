import Stripe from 'stripe';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { LoggingService } from '@/app/lib/services/LoggingService';
import { CONFIG } from '@/app/config/constants';

// Initialize Stripe client (lazy initialization)
let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(secretKey);
  }
  return stripe;
}

export interface SubscriptionStatus {
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  isActive: boolean;
  canUseFeature: boolean;
  remainingUsage: number;
  maxUsage: number;
  limits: {
    maxTransformations: number;
    maxFileSize: number;
    features: string[];
  };
  currentPeriodEnd?: Date;
  trialEnd?: Date;
}

export class SubscriptionService {
  /**
   * 创建订阅
   */
  static async createSubscription(userId: string, plan: 'basic' | 'pro' | 'enterprise'): Promise<{ url: string }> {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const PLAN_TO_PRICE: Record<string, string | undefined> = {
      basic: process.env.STRIPE_PRICE_ID_BASIC,
      pro: process.env.STRIPE_PRICE_ID_PRO,
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    };

    const priceId = PLAN_TO_PRICE[plan];
    if (!priceId) throw new Error('Invalid plan');

    // 确保有 Stripe 客户
    if (!user.subscription?.stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name,
        metadata: { appUserId: user._id.toString() },
      });
      user.subscription = {
        ...(user.subscription || {}),
        plan: user.subscription?.plan || 'free',
        isActive: false,
        stripeCustomerId: customer.id,
      };
      await user.save();
    }

    const successUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/?billing=success`;
    const cancelUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/?billing=cancel`;

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer: user.subscription!.stripeCustomerId!,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { appUserId: user._id.toString(), plan },
    });

    // 记录订阅创建尝试日志
    await LoggingService.logSubscription({
      userId: user._id.toString(),
      action: 'created',
      toPlan: plan,
      stripeEventId: session.id,
      stripeEventType: 'checkout.session.created',
      status: 'pending',
      metadata: {
        sessionId: session.id,
        customerId: user.subscription!.stripeCustomerId!,
        priceId,
      },
    });

    return { url: session.url! };
  }

  /**
   * 更新订阅计划
   */
  static async updateSubscription(userId: string, newPlan: 'basic' | 'pro' | 'enterprise'): Promise<SubscriptionStatus> {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (!user.subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const PLAN_TO_PRICE: Record<string, string | undefined> = {
      basic: process.env.STRIPE_PRICE_ID_BASIC,
      pro: process.env.STRIPE_PRICE_ID_PRO,
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    };

    const newPriceId = PLAN_TO_PRICE[newPlan];
    if (!newPriceId) throw new Error('Price not found for plan');

    // 获取当前订阅
    const subscription = await getStripe().subscriptions.retrieve(user.subscription.stripeSubscriptionId);
    
    // 更新订阅
    const updatedSubscription = await getStripe().subscriptions.update(subscription.id, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
    });

    // 更新用户订阅信息
    const oldPlan = user.subscription.plan;
    user.subscription = {
      ...user.subscription,
      plan: newPlan,
      isActive: updatedSubscription.status === 'active' || updatedSubscription.status === 'trialing',
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
    };
    await user.save();

    // 记录订阅日志
    await LoggingService.logSubscription({
      userId: user._id.toString(),
      subscriptionId: subscription.id,
      action: 'updated',
      fromPlan: oldPlan,
      toPlan: newPlan,
      amount: updatedSubscription.items.data[0]?.price.unit_amount || 0,
      currency: updatedSubscription.currency,
      status: 'success',
      metadata: {
        oldPriceId: subscription.items.data[0].price.id,
        newPriceId,
        prorationBehavior: 'create_prorations',
      },
    });

    return this.getSubscriptionStatus(userId);
  }

  /**
   * 取消订阅
   */
  static async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<SubscriptionStatus> {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (!user.subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // 取消订阅
    const canceledSubscription = await getStripe().subscriptions.update(user.subscription.stripeSubscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    // 更新用户订阅信息
    user.subscription = {
      ...user.subscription,
      isActive: !cancelAtPeriodEnd && (canceledSubscription.status === 'active' || canceledSubscription.status === 'trialing'),
    };
    await user.save();

    // 记录订阅日志
    await LoggingService.logSubscription({
      userId: user._id.toString(),
      subscriptionId: user.subscription.stripeSubscriptionId,
      action: 'cancelled',
      status: 'success',
      metadata: {
        cancelAtPeriodEnd,
        canceledAt: cancelAtPeriodEnd ? new Date(canceledSubscription.current_period_end * 1000) : new Date(),
      },
    });

    return this.getSubscriptionStatus(userId);
  }

  /**
   * 获取订阅状态
   */
  static async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const plan = user.subscription?.plan || 'free';
    const isActive = user.subscription?.isActive || false;
    
    // 获取订阅限制
    const limits = this.getSubscriptionLimits(plan);
    
    // 计算剩余使用量
    const remainingUsage = Math.max(0, limits.maxTransformations - user.usage.totalTransformations);
    
    // 检查是否可以访问功能
    const canUseFeature = limits.maxTransformations === -1 || user.usage.totalTransformations < limits.maxTransformations;

    return {
      plan,
      isActive,
      canUseFeature,
      remainingUsage,
      maxUsage: limits.maxTransformations,
      limits,
      currentPeriodEnd: user.subscription?.currentPeriodEnd,
      trialEnd: user.subscription?.trialEnd,
    };
  }

  /**
   * 检查使用量限制
   */
  static async checkUsageLimit(userId: string, operation: string = 'transform', count: number = 1): Promise<boolean> {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return false;

    const limits = this.getSubscriptionLimits(user.subscription?.plan || 'free');
    
    if (limits.maxTransformations === -1) return true; // 无限制
    
    return user.usage.totalTransformations + count <= limits.maxTransformations;
  }

  /**
   * 记录使用量
   */
  static async recordUsage(userId: string, operation: string = 'transform', count: number = 1): Promise<void> {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return;

    // 检查使用量限制
    const canUse = await this.checkUsageLimit(userId, operation, count);
    if (!canUse) {
      throw new Error('Usage limit exceeded');
    }

    // 更新使用量
    user.usage.totalTransformations += count;
    await user.save();

    // 记录使用量日志
    await LoggingService.logSubscription({
      userId: user._id.toString(),
      action: 'updated',
      status: 'success',
      metadata: {
        operation,
        count,
        totalUsage: user.usage.totalTransformations,
      },
    });
  }

  /**
   * 获取订阅限制
   */
  static getSubscriptionLimits(plan: string) {
    switch (plan) {
      case 'basic':
        return {
          maxTransformations: CONFIG.SUBSCRIPTION.PLANS.BASIC.conversions,
          maxFileSize: 5 * 1024 * 1024, // 5MB
          features: CONFIG.SUBSCRIPTION.PLANS.BASIC.features,
        };
      case 'pro':
        return {
          maxTransformations: CONFIG.SUBSCRIPTION.PLANS.PRO.conversions,
          maxFileSize: 10 * 1024 * 1024, // 10MB
          features: CONFIG.SUBSCRIPTION.PLANS.PRO.features,
        };
      case 'enterprise':
        return {
          maxTransformations: CONFIG.SUBSCRIPTION.PLANS.ENTERPRISE.conversions,
          maxFileSize: 50 * 1024 * 1024, // 50MB
          features: CONFIG.SUBSCRIPTION.PLANS.ENTERPRISE.features,
        };
      default: // free
        return {
          maxTransformations: CONFIG.FREE_TRIAL.AUTHENTICATED_USER_LIMIT,
          maxFileSize: CONFIG.UPLOAD.ANONYMOUS_MAX_SIZE,
          features: ['基础功能'],
        };
    }
  }

  /**
   * 同步 Stripe 订阅状态
   */
  static async syncSubscriptionFromStripe(userId: string): Promise<void> {
    await connectDB();
    const user = await User.findById(userId);
    if (!user || !user.subscription?.stripeSubscriptionId) return;

    try {
      const subscription = await getStripe().subscriptions.retrieve(user.subscription.stripeSubscriptionId);
      
      // 更新用户订阅信息
      user.subscription = {
        ...user.subscription,
        isActive: subscription.status === 'active' || subscription.status === 'trialing',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };
      await user.save();

      // 记录同步日志
      await LoggingService.logSubscription({
        userId: user._id.toString(),
        subscriptionId: subscription.id,
        action: 'updated',
        status: 'success',
        metadata: {
          syncFromStripe: true,
          stripeStatus: subscription.status,
        },
      });
    } catch (error) {
      console.error('Failed to sync subscription from Stripe:', error);
    }
  }
}


