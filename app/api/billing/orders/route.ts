import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { LoggingService } from '@/app/lib/services/LoggingService';
import SubscriptionRecord from '@/app/models/SubscriptionRecord';
import PaymentInfo from '@/app/models/PaymentInfo';

export const runtime = 'nodejs';

// 获取用户订单历史
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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const type = url.searchParams.get('type') || 'all'; // all, subscription, payment

    const offset = (page - 1) * limit;

    let orders: any[] = [];

    if (type === 'all' || type === 'subscription') {
      // 获取订阅记录
      const subscriptionRecords = await SubscriptionRecord.find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);

      const subscriptionOrders = subscriptionRecords.map(record => ({
        id: record._id,
        type: 'subscription',
        orderId: record.stripeSubscriptionId,
        plan: record.plan,
        amount: record.amount,
        currency: record.currency,
        status: record.status,
        createdAt: record.createdAt,
        currentPeriodStart: record.currentPeriodStart,
        currentPeriodEnd: record.currentPeriodEnd,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        interval: record.interval,
        intervalCount: record.intervalCount,
        quantity: record.quantity,
        metadata: record.metadata,
      }));

      orders = [...orders, ...subscriptionOrders];
    }

    if (type === 'all' || type === 'payment') {
      // 获取支付记录
      const paymentRecords = await PaymentInfo.find({ userId: decoded.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);

      const paymentOrders = paymentRecords.map(record => ({
        id: record._id,
        type: 'payment',
        orderId: record.paymentIntentId,
        amount: record.amount,
        currency: record.currency,
        status: record.status,
        createdAt: record.createdAt,
        paidAt: record.paidAt,
        description: record.description,
        paymentMethod: record.paymentMethod,
        billingDetails: record.billingDetails,
        receiptUrl: record.receiptUrl,
        metadata: record.metadata,
      }));

      orders = [...orders, ...paymentOrders];
    }

    // 按创建时间排序
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 分页
    const total = orders.length;
    const paginatedOrders = orders.slice(0, limit);

    return NextResponse.json({
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Failed to get orders' }, { status: 500 });
  }
}

// 获取单个订单详情
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

    const { orderId, type } = await req.json();

    if (!orderId || !type) {
      return NextResponse.json({ error: 'Missing orderId or type' }, { status: 400 });
    }

    await connectDB();

    let order = null;

    if (type === 'subscription') {
      order = await SubscriptionRecord.findOne({
        _id: orderId,
        userId: decoded.userId,
      });
    } else if (type === 'payment') {
      order = await PaymentInfo.findOne({
        _id: orderId,
        userId: decoded.userId,
      });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });

  } catch (error) {
    console.error('Get order detail error:', error);
    return NextResponse.json({ error: 'Failed to get order detail' }, { status: 500 });
  }
}
