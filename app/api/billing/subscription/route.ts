import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { LoggingService } from '@/app/lib/services/LoggingService';

export const runtime = 'nodejs';

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

// 获取用户订阅状态
export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 获取订阅统计信息
    const stats = await LoggingService.getSubscriptionStats(decoded.userId);
    
    // 获取订阅记录
    const subscriptionRecords = await LoggingService.getUserSubscriptionRecords(decoded.userId);

    return NextResponse.json({
      subscription: user.subscription,
      stats,
      records: subscriptionRecords,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 });
  }
}

// 更新订阅计划
export async function PUT(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { plan } = await req.json();
    if (!plan || !['basic', 'pro', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (!user.subscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // 获取当前订阅
    const subscription = await getStripe().subscriptions.retrieve(user.subscription.stripeSubscriptionId);
    
    // 获取新的价格ID
    const PLAN_TO_PRICE: Record<string, string | undefined> = {
      basic: process.env.STRIPE_PRICE_ID_BASIC,
      pro: process.env.STRIPE_PRICE_ID_PRO,
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    };
    
    const newPriceId = PLAN_TO_PRICE[plan];
    if (!newPriceId) {
      return NextResponse.json({ error: 'Price not found for plan' }, { status: 400 });
    }

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
      plan: plan as 'basic' | 'pro' | 'enterprise',
      isActive: updatedSubscription.status === 'active' || updatedSubscription.status === 'trialing',
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
    };
    await user.save();

    // 记录订阅日志
    await LoggingService.logSubscription({
      userId: decoded.userId,
      subscriptionId: subscription.id,
      action: 'updated',
      fromPlan: oldPlan,
      toPlan: plan as 'basic' | 'pro' | 'enterprise',
      amount: updatedSubscription.items.data[0]?.price.unit_amount || 0,
      currency: updatedSubscription.currency,
      status: 'success',
      metadata: {
        oldPriceId: subscription.items.data[0].price.id,
        newPriceId,
        prorationBehavior: 'create_prorations',
      },
    });

    return NextResponse.json({
      message: 'Subscription updated successfully',
      subscription: user.subscription,
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

// 取消订阅
export async function DELETE(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { cancelAtPeriodEnd = true } = await req.json();

    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (!user.subscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
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
      userId: decoded.userId,
      subscriptionId: user.subscription.stripeSubscriptionId,
      action: 'cancelled',
      status: 'success',
      metadata: {
        cancelAtPeriodEnd,
        canceledAt: cancelAtPeriodEnd ? new Date(canceledSubscription.current_period_end * 1000) : new Date(),
      },
    });

    return NextResponse.json({
      message: cancelAtPeriodEnd ? 'Subscription will be canceled at the end of the current period' : 'Subscription canceled immediately',
      subscription: user.subscription,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}


