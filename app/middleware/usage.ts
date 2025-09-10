import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { LoggingService } from '@/app/lib/services/LoggingService';

// 记录使用量的中间件
export function trackUsage(operation: string = 'transform', count: number = 1) {
  return async (req: NextRequest) => {
    try {
      const auth = req.headers.get('authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      
      if (!token) {
        return NextResponse.next(); // 如果没有token，跳过记录
      }

      let decoded: { userId: string };
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.error('JWT_SECRET environment variable is not set');
          return NextResponse.next(); // 跳过记录
        }
        decoded = jwt.verify(token, jwtSecret) as { userId: string };
      } catch (error) {
        console.error('Token verification failed:', error);
        return NextResponse.next(); // 如果token无效，跳过记录
      }

      await connectDB();
      const user = await User.findById(decoded.userId);
      
      if (user) {
        // 更新使用量
        user.usage.totalTransformations += count;
        await user.save();

        // 记录使用量日志（可选）
        await LoggingService.logSubscription({
          userId: decoded.userId,
          action: 'updated',
          status: 'success',
          metadata: {
            operation,
            count,
            totalUsage: user.usage.totalTransformations,
          },
        });
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Usage tracking error:', error);
      // 不抛出错误，避免影响主业务流程
      return NextResponse.next();
    }
  };
}

// 检查使用量限制的中间件
export function checkUsageLimit(operation: string = 'transform', count: number = 1) {
  return async (req: NextRequest) => {
    try {
      const auth = req.headers.get('authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      
      if (!token) {
        return NextResponse.next(); // 如果没有token，跳过检查
      }

      let decoded: { userId: string };
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.error('JWT_SECRET environment variable is not set');
          return NextResponse.next(); // 跳过检查
        }
        decoded = jwt.verify(token, jwtSecret) as { userId: string };
      } catch (error) {
        console.error('Token verification failed:', error);
        return NextResponse.next(); // 如果token无效，跳过检查
      }

      await connectDB();
      const user = await User.findById(decoded.userId);
      
      if (user) {
        // 获取订阅限制
        const limits = getSubscriptionLimits(user.subscription?.plan || 'free');
        
        // 检查使用量限制
        if (limits.maxTransformations !== -1 && user.usage.totalTransformations + count > limits.maxTransformations) {
          return NextResponse.json({ 
            error: 'Usage limit exceeded',
            details: {
              currentUsage: user.usage.totalTransformations,
              limit: limits.maxTransformations,
              requested: count,
              remaining: Math.max(0, limits.maxTransformations - user.usage.totalTransformations),
            }
          }, { status: 403 });
        }
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      return NextResponse.next(); // 不抛出错误，避免影响主业务流程
    }
  };
}

// 获取订阅限制
function getSubscriptionLimits(plan: string) {
  const CONFIG = {
    FREE_TRIAL: {
      AUTHENTICATED_USER_LIMIT: 100,
    },
    SUBSCRIPTION: {
      PLANS: {
        BASIC: { conversions: 500 },
        PRO: { conversions: 2000 },
        ENTERPRISE: { conversions: -1 },
      }
    }
  };

  switch (plan) {
    case 'basic':
      return { maxTransformations: CONFIG.SUBSCRIPTION.PLANS.BASIC.conversions };
    case 'pro':
      return { maxTransformations: CONFIG.SUBSCRIPTION.PLANS.PRO.conversions };
    case 'enterprise':
      return { maxTransformations: CONFIG.SUBSCRIPTION.PLANS.ENTERPRISE.conversions };
    default: // free
      return { maxTransformations: CONFIG.FREE_TRIAL.AUTHENTICATED_USER_LIMIT };
  }
}

