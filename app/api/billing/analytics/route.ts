import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import SubscriptionRecord from '@/app/models/SubscriptionRecord';
import PaymentInfo from '@/app/models/PaymentInfo';
import { LoggingService } from '@/app/lib/services/LoggingService';

export const runtime = 'nodejs';

// 获取订阅分析数据
export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { userId: string; email?: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { userId: string; email?: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 检查管理员权限
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@example.com'];
    const isAdmin = adminEmails.includes(user.email) || adminEmails.includes(decoded.email);
    
    if (!isAdmin) {
      console.log(`❌ 用户 ${user.email} 尝试访问分析数据，但无管理员权限`);
      return NextResponse.json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    console.log(`📊 管理员 ${user.email} 访问订阅分析数据...`);

    // 获取所有订阅记录
    const subscriptionRecords = await SubscriptionRecord.find({ userId: decoded.userId })
      .sort({ createdAt: -1 });

    // 获取所有支付记录
    const paymentRecords = await PaymentInfo.find({ userId: decoded.userId })
      .sort({ createdAt: -1 });

    // 获取订阅日志
    const subscriptionLogs = await LoggingService.getUserSubscriptionLogs(decoded.userId, 50);

    // 分析订阅数据
    const analytics = analyzeSubscriptionData(subscriptionRecords, paymentRecords, subscriptionLogs);

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to get analytics data' }, { status: 500 });
  }
}

// 分析订阅数据
function analyzeSubscriptionData(
  subscriptionRecords: any[],
  paymentRecords: any[],
  subscriptionLogs: any[]
) {
  // 基础统计
  const totalSubscriptions = subscriptionRecords.length;
  const activeSubscriptions = subscriptionRecords.filter(sub => sub.status === 'active').length;
  const totalPayments = paymentRecords.length;
  const totalRevenue = paymentRecords.reduce((sum, payment) => sum + payment.amount, 0);

  // 按计划类型统计
  const planStats = {
    basic: { count: 0, revenue: 0, active: 0 },
    pro: { count: 0, revenue: 0, active: 0 },
    enterprise: { count: 0, revenue: 0, active: 0 }
  };

  subscriptionRecords.forEach(sub => {
    if (planStats[sub.plan as keyof typeof planStats]) {
      planStats[sub.plan as keyof typeof planStats].count++;
      if (sub.status === 'active') {
        planStats[sub.plan as keyof typeof planStats].active++;
      }
    }
  });

  // 计算每个计划的收入
  paymentRecords.forEach(payment => {
    // 根据金额推断计划类型
    if (payment.amount === 999) {
      planStats.basic.revenue += payment.amount;
    } else if (payment.amount === 1999) {
      planStats.pro.revenue += payment.amount;
    } else if (payment.amount === 4999) {
      planStats.enterprise.revenue += payment.amount;
    }
  });

  // 时间分析
  const monthlyStats = getMonthlyStats(subscriptionRecords, paymentRecords);
  const recentActivity = getRecentActivity(subscriptionLogs);

  // 使用量分析
  const usageAnalysis = getUsageAnalysis(planStats);

  // 订阅趋势
  const subscriptionTrends = getSubscriptionTrends(subscriptionRecords);

  return {
    overview: {
      totalSubscriptions,
      activeSubscriptions,
      totalPayments,
      totalRevenue: totalRevenue / 100, // 转换为美元
      averageRevenue: totalPayments > 0 ? (totalRevenue / 100) / totalPayments : 0
    },
    planDistribution: planStats,
    monthlyStats,
    recentActivity,
    usageAnalysis,
    subscriptionTrends,
    rawData: {
      subscriptions: subscriptionRecords.map(sub => ({
        id: sub.stripeSubscriptionId,
        plan: sub.plan,
        status: sub.status,
        amount: sub.amount / 100,
        currency: sub.currency,
        createdAt: sub.createdAt,
        currentPeriodEnd: sub.currentPeriodEnd
      })),
      payments: paymentRecords.map(payment => ({
        id: payment.paymentIntentId,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
        description: payment.description
      }))
    }
  };
}

// 获取月度统计
function getMonthlyStats(subscriptionRecords: any[], paymentRecords: any[]) {
  const monthlyData: { [key: string]: { subscriptions: number, revenue: number } } = {};
  
  // 处理订阅记录
  subscriptionRecords.forEach(sub => {
    const month = sub.createdAt.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { subscriptions: 0, revenue: 0 };
    }
    monthlyData[month].subscriptions++;
  });

  // 处理支付记录
  paymentRecords.forEach(payment => {
    const month = payment.createdAt.toISOString().substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { subscriptions: 0, revenue: 0 };
    }
    monthlyData[month].revenue += payment.amount / 100;
  });

  return Object.entries(monthlyData)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// 获取最近活动
function getRecentActivity(subscriptionLogs: any[]) {
  return subscriptionLogs.slice(0, 10).map(log => ({
    action: log.action,
    fromPlan: log.fromPlan,
    toPlan: log.toPlan,
    status: log.status,
    createdAt: log.createdAt,
    amount: log.amount / 100
  }));
}

// 获取使用量分析
function getUsageAnalysis(planStats: any) {
  const totalBasicUsage = planStats.basic.active * 500;
  const totalProUsage = planStats.pro.active * 2000;
  const hasEnterprise = planStats.enterprise.active > 0;

  return {
    totalUsage: hasEnterprise ? -1 : totalBasicUsage + totalProUsage,
    usageBreakdown: {
      basic: totalBasicUsage,
      pro: totalProUsage,
      enterprise: hasEnterprise ? -1 : 0
    },
    hasUnlimited: hasEnterprise,
    efficiency: hasEnterprise ? 100 : Math.min(100, ((totalBasicUsage + totalProUsage) / 10000) * 100)
  };
}

// 获取订阅趋势
function getSubscriptionTrends(subscriptionRecords: any[]) {
  const trends = {
    growth: 0,
    churn: 0,
    upgrades: 0,
    downgrades: 0
  };

  // 简化的趋势分析
  const activeCount = subscriptionRecords.filter(sub => sub.status === 'active').length;
  const totalCount = subscriptionRecords.length;
  
  if (totalCount > 0) {
    trends.growth = (activeCount / totalCount) * 100;
  }

  return trends;
}
