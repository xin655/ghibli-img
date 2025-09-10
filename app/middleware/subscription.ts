import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { CONFIG } from '@/app/config/constants';

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
}

export async function validateSubscription(
  userId: string, 
  requiredPlan?: string,
  operation?: string
): Promise<SubscriptionStatus> {
  await connectDB();
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  const plan = user.subscription?.plan || 'free';
  const isActive = user.subscription?.isActive || false;
  
  // 获取订阅限制
  const limits = getSubscriptionLimits(plan);
  
  // 计算剩余使用量
  const remainingUsage = Math.max(0, limits.maxTransformations - user.usage.totalTransformations);
  
  // 检查是否可以访问功能
  let canUseFeature = true;
  
  // 检查计划要求
  if (requiredPlan && !hasRequiredPlan(plan, requiredPlan)) {
    canUseFeature = false;
  }
  
  // 检查使用量限制
  if (operation === 'transform' && limits.maxTransformations !== -1 && user.usage.totalTransformations >= limits.maxTransformations) {
    canUseFeature = false;
  }
  
  // 检查订阅状态
  if (requiredPlan && requiredPlan !== 'free' && !isActive) {
    canUseFeature = false;
  }

  return {
    plan,
    isActive,
    canUseFeature,
    remainingUsage,
    maxUsage: limits.maxTransformations,
    limits,
  };
}

export function hasRequiredPlan(userPlan: string, requiredPlan: string): boolean {
  const planHierarchy = ['free', 'basic', 'pro', 'enterprise'];
  const userPlanIndex = planHierarchy.indexOf(userPlan);
  const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);
  
  return userPlanIndex >= requiredPlanIndex;
}

export function getSubscriptionLimits(plan: string) {
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

// 中间件：验证订阅状态
export function requireSubscription(requiredPlan?: string) {
  return async (req: NextRequest) => {
    try {
      const auth = req.headers.get('authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      
      if (!token) {
        return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
      }

      let decoded: { userId: string };
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.error('JWT_SECRET environment variable is not set');
          return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        decoded = jwt.verify(token, jwtSecret) as { userId: string };
      } catch (error) {
        console.error('Token verification failed:', error);
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }

      const subscriptionStatus = await validateSubscription(decoded.userId, requiredPlan);
      
      if (!subscriptionStatus.canUseFeature) {
        return NextResponse.json({ 
          error: 'Subscription required',
          details: {
            currentPlan: subscriptionStatus.plan,
            requiredPlan: requiredPlan || 'any paid plan',
            isActive: subscriptionStatus.isActive,
            remainingUsage: subscriptionStatus.remainingUsage,
            maxUsage: subscriptionStatus.maxUsage,
          }
        }, { status: 403 });
      }

      // 将订阅状态添加到请求头中，供后续处理使用
      const response = NextResponse.next();
      response.headers.set('X-Subscription-Plan', subscriptionStatus.plan);
      response.headers.set('X-Subscription-Active', subscriptionStatus.isActive.toString());
      response.headers.set('X-Remaining-Usage', subscriptionStatus.remainingUsage.toString());
      
      return response;
    } catch (error) {
      console.error('Subscription validation error:', error);
      return NextResponse.json({ error: 'Subscription validation failed' }, { status: 500 });
    }
  };
}

// 中间件：检查使用量限制
export function checkUsageLimit(operation: string = 'transform') {
  return async (req: NextRequest) => {
    try {
      const auth = req.headers.get('authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      
      if (!token) {
        return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
      }

      let decoded: { userId: string };
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.error('JWT_SECRET environment variable is not set');
          return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        decoded = jwt.verify(token, jwtSecret) as { userId: string };
      } catch (error) {
        console.error('Token verification failed:', error);
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }

      const subscriptionStatus = await validateSubscription(decoded.userId, undefined, operation);
      
      if (!subscriptionStatus.canUseFeature) {
        return NextResponse.json({ 
          error: 'Usage limit exceeded',
          details: {
            currentUsage: subscriptionStatus.maxUsage - subscriptionStatus.remainingUsage,
            limit: subscriptionStatus.maxUsage,
            remaining: subscriptionStatus.remainingUsage,
            operation,
          }
        }, { status: 403 });
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      return NextResponse.json({ error: 'Usage limit check failed' }, { status: 500 });
    }
  };
}

