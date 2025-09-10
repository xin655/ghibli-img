import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { CONFIG } from '@/app/config/constants';

export const runtime = 'nodejs';

// 获取用户使用量统计
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

    // 获取订阅限制
    const limits = getSubscriptionLimits(user.subscription?.plan || 'free');
    
    // 计算剩余使用量
    const remainingUsage = Math.max(0, limits.maxTransformations - user.usage.totalTransformations);
    const usagePercentage = limits.maxTransformations > 0 
      ? (user.usage.totalTransformations / limits.maxTransformations) * 100 
      : 0;

    return NextResponse.json({
      usage: {
        totalTransformations: user.usage.totalTransformations,
        freeTrialsRemaining: user.usage.freeTrialsRemaining,
        remainingUsage,
        usagePercentage: Math.round(usagePercentage),
      },
      limits,
      subscription: {
        plan: user.subscription?.plan || 'free',
        isActive: user.subscription?.isActive || false,
        currentPeriodEnd: user.subscription?.currentPeriodEnd,
      },
      user: {
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Get usage error:', error);
    return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 });
  }
}

// 记录使用量
export async function POST(req: Request) {
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

    const { operation = 'transform', count = 1 } = await req.json();

    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 检查使用量限制
    const limits = getSubscriptionLimits(user.subscription?.plan || 'free');
    const newTotal = user.usage.totalTransformations + count;
    
    if (newTotal > limits.maxTransformations && limits.maxTransformations !== -1) {
      return NextResponse.json({ 
        error: 'Usage limit exceeded',
        details: {
          currentUsage: user.usage.totalTransformations,
          limit: limits.maxTransformations,
          requested: count,
        }
      }, { status: 403 });
    }

    // 更新使用量
    user.usage.totalTransformations = newTotal;
    await user.save();

    // 计算新的使用量统计
    const remainingUsage = Math.max(0, limits.maxTransformations - user.usage.totalTransformations);
    const usagePercentage = limits.maxTransformations > 0 
      ? (user.usage.totalTransformations / limits.maxTransformations) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      usage: {
        totalTransformations: user.usage.totalTransformations,
        freeTrialsRemaining: user.usage.freeTrialsRemaining,
        remainingUsage,
        usagePercentage: Math.round(usagePercentage),
      },
      limits,
    });
  } catch (error) {
    console.error('Record usage error:', error);
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 });
  }
}

// 检查使用量限制
export async function HEAD(req: Request) {
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

    const url = new URL(req.url);
    const operation = url.searchParams.get('operation') || 'transform';
    const count = parseInt(url.searchParams.get('count') || '1');

    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 检查使用量限制
    const limits = getSubscriptionLimits(user.subscription?.plan || 'free');
    const newTotal = user.usage.totalTransformations + count;
    const canUse = limits.maxTransformations === -1 || newTotal <= limits.maxTransformations;

    return new NextResponse(null, {
      status: canUse ? 200 : 403,
      headers: {
        'X-Usage-Limit': limits.maxTransformations.toString(),
        'X-Current-Usage': user.usage.totalTransformations.toString(),
        'X-Remaining-Usage': Math.max(0, limits.maxTransformations - user.usage.totalTransformations).toString(),
        'X-Can-Use': canUse.toString(),
      },
    });
  } catch (error) {
    console.error('Check usage error:', error);
    return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 });
  }
}

// 获取订阅限制
function getSubscriptionLimits(plan: string) {
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

