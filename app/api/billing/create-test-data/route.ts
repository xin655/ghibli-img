import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { LoggingService } from '@/app/lib/services/LoggingService';

export const runtime = 'nodejs';

// 创建测试订阅数据
export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || '') as { userId: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    console.log(`🔧 为用户 ${user.email} 创建测试订阅数据...`);

    // 创建订阅记录
    await LoggingService.logSubscriptionRecord({
      userId: decoded.userId,
      stripeSubscriptionId: 'sub_test_enterprise_123',
      stripeCustomerId: user.subscription?.stripeCustomerId || 'cus_test_123',
      plan: user.subscription?.plan || 'enterprise',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
      trialStart: undefined,
      trialEnd: undefined,
      cancelAtPeriodEnd: false,
      canceledAt: undefined,
      endedAt: undefined,
      priceId: 'price_enterprise_test',
      amount: 4999, // $49.99
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      quantity: 1,
      metadata: {
        test: true,
        createdBy: 'api_endpoint'
      },
      stripeData: {
        id: 'sub_test_enterprise_123',
        status: 'active',
        plan: {
          id: 'price_enterprise_test',
          amount: 4999,
          currency: 'usd'
        }
      }
    });

    console.log('✅ 订阅记录创建成功');

    // 创建支付记录
    await LoggingService.logPayment({
      userId: decoded.userId,
      subscriptionId: 'sub_test_enterprise_123',
      paymentIntentId: 'pi_test_payment_123',
      invoiceId: 'in_test_invoice_123',
      chargeId: 'ch_test_charge_123',
      amount: 4999,
      currency: 'usd',
      status: 'succeeded',
      paymentMethod: {
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expMonth: 12,
        expYear: 2025,
        country: 'US'
      },
      billingDetails: {
        name: user.name,
        email: user.email,
        phone: null,
        address: {
          line1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'US'
        }
      },
      description: 'Enterprise subscription payment',
      receiptUrl: 'https://pay.stripe.com/receipts/test_receipt_123',
      paidAt: new Date(),
      metadata: {
        test: true,
        createdBy: 'api_endpoint'
      },
      stripeData: {
        id: 'pi_test_payment_123',
        status: 'succeeded'
      }
    });

    console.log('✅ 支付记录创建成功');

    return NextResponse.json({ 
      success: true, 
      message: '测试订阅数据创建成功',
      data: {
        subscriptionRecord: 'sub_test_enterprise_123',
        paymentRecord: 'pi_test_payment_123'
      }
    });

  } catch (error) {
    console.error('Create test data error:', error);
    return NextResponse.json({ error: 'Failed to create test data' }, { status: 500 });
  }
}

