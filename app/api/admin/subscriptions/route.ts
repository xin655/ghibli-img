import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import SubscriptionRecord from '@/app/models/SubscriptionRecord';
import PaymentInfo from '@/app/models/PaymentInfo';
import { LoggingService } from '@/app/lib/services/LoggingService';

export const runtime = 'nodejs';

// 验证管理员权限
async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', {
      issuer: 'ghibli-dreamer',
      audience: 'ghibli-dreamer-users'
    }) as { userId: string, isAdmin?: boolean };
    
    // 检查token中是否包含管理员权限
    if (decoded.isAdmin) {
      return { isAdmin: true, userId: decoded.userId };
    }
    
    // 如果token中没有isAdmin字段，检查数据库中的用户权限
    await connectDB();
    const user = await User.findById(decoded.userId);
    if (user && user.isAdmin) {
      return { isAdmin: true, userId: decoded.userId };
    }
    
    return { isAdmin: false };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { isAdmin: false };
  }
}

// 获取所有订阅统计
export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminResult = await verifyAdmin(token);
    if (!adminResult.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'overview';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    switch (type) {
      case 'overview': {
        // 获取总体统计
        const [
          totalUsers,
          activeSubscriptions,
          totalRevenue,
          planDistribution,
          recentSubscriptions,
          recentPayments
        ] = await Promise.all([
          User.countDocuments(),
          User.countDocuments({ 'subscription.isActive': true }),
          PaymentInfo.aggregate([
            { $match: { status: 'succeeded' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]),
          User.aggregate([
            { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
          ]),
          SubscriptionRecord.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'name email')
            .lean(),
          PaymentInfo.find({ status: 'succeeded' })
            .sort({ paidAt: -1 })
            .limit(10)
            .populate('userId', 'name email')
            .lean()
        ]);

        return NextResponse.json({
          overview: {
            totalUsers,
            activeSubscriptions,
            totalRevenue: totalRevenue[0]?.total || 0,
            planDistribution,
          },
          recent: {
            subscriptions: recentSubscriptions,
            payments: recentPayments,
          }
        });
      }

      case 'users': {
        // 获取用户列表
        const users = await User.find()
          .select('name email subscription usage createdAt')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();

        return NextResponse.json({ users });
      }

      case 'subscriptions': {
        // 获取订阅记录
        const subscriptions = await SubscriptionRecord.find()
          .populate('userId', 'name email')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();

        return NextResponse.json({ subscriptions });
      }

      case 'payments': {
        // 获取支付记录
        const payments = await PaymentInfo.find()
          .populate('userId', 'name email')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean();

        return NextResponse.json({ payments });
      }

      case 'revenue': {
        // 获取收入统计
        const revenueStats = await PaymentInfo.aggregate([
          { $match: { status: 'succeeded' } },
          {
            $group: {
              _id: {
                year: { $year: '$paidAt' },
                month: { $month: '$paidAt' }
              },
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 12 }
        ]);

        return NextResponse.json({ revenueStats });
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Failed to get admin data' }, { status: 500 });
  }
}


