import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { LoggingService } from '@/app/lib/services/LoggingService';
import { SubscriptionService } from '@/app/lib/services/SubscriptionService';

export const runtime = 'nodejs';

// 获取用户订阅统计信息
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

    // 获取订阅状态
    const subscriptionStatus = await SubscriptionService.getSubscriptionStatus(decoded.userId);
    
    // 获取订阅统计
    const subscriptionStats = await LoggingService.getSubscriptionStats(decoded.userId);
    
    // 获取最近的订阅日志
    const recentLogs = await LoggingService.getUserSubscriptionLogs(decoded.userId, 10, 0);
    
    // 获取支付历史
    const paymentHistory = await LoggingService.getUserPaymentHistory(decoded.userId, 10, 0);

    // 计算使用量统计
    const usageStats = {
      totalTransformations: user.usage.totalTransformations,
      freeTrialsRemaining: user.usage.freeTrialsRemaining,
      remainingUsage: subscriptionStatus.remainingUsage,
      maxUsage: subscriptionStatus.maxUsage,
      usagePercentage: subscriptionStatus.maxUsage > 0 
        ? Math.round((user.usage.totalTransformations / subscriptionStatus.maxUsage) * 100)
        : 0,
    };

    // 计算订阅历史统计
    const subscriptionHistory = {
      totalSubscriptions: subscriptionStats.totalSubscriptions,
      activeSubscriptions: subscriptionStats.activeSubscriptions,
      totalAmount: subscriptionStats.totalAmount,
      lastPaymentDate: subscriptionStats.lastPaymentDate,
    };

    return NextResponse.json({
      subscription: subscriptionStatus,
      usage: usageStats,
      history: subscriptionHistory,
      recentLogs,
      paymentHistory,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}


