import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { LoggingService } from '@/app/lib/services/LoggingService';
import { verifyToken, extractTokenFromHeader } from '@/app/lib/auth';
import { withApiLogging, ApiLogger, UserActivityLogger, UserAction, PerformanceLogger } from '@/app/lib/logger';

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

const PLAN_TO_PRICE: Record<string, string | undefined> = {
  basic: process.env.STRIPE_PRICE_ID_BASIC,
  pro: process.env.STRIPE_PRICE_ID_PRO,
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
};

export const POST = withApiLogging(async (req: Request) => {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  
  try {
    // 提取和验证token
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const authResult = verifyToken(token);
    if (!authResult.isValid || !authResult.payload) {
      return NextResponse.json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      }, { status: 401 });
    }

    const { userId } = authResult.payload;

    const { plan } = await req.json();
    
    // Log subscription attempt
    UserActivityLogger.logSubscriptionAction(
      UserAction.SUBSCRIBE,
      plan,
      true, // Will be updated based on result
      {
        requestId,
        userId,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      }
    );
    const priceId = PLAN_TO_PRICE[plan];
    
    // 检查价格 ID 是否有效
    if (!priceId) {
      console.error('Price ID not found for plan:', plan);
      console.error('Available plans:', Object.keys(PLAN_TO_PRICE));
      console.error('Environment variables:', {
        STRIPE_PRICE_ID_BASIC: process.env.STRIPE_PRICE_ID_BASIC ? 'Set' : 'Not set',
        STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO ? 'Set' : 'Not set',
        STRIPE_PRICE_ID_ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE ? 'Set' : 'Not set',
      });
      
      return NextResponse.json({ 
        error: 'Subscription plan not configured. Please contact support.',
        code: 'PLAN_NOT_CONFIGURED'
      }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      ApiLogger.logApiError(requestId, new Error('User not found'), { userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure stripe customer
    if (!user.subscription?.stripeCustomerId) {
      console.log('Creating new Stripe customer for user:', user.email);
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name,
        metadata: { appUserId: user._id.toString() },
      });
      
      // 确保 subscription 对象存在
      if (!user.subscription) {
        user.subscription = {
          plan: 'free',
          isActive: false,
          stripeCustomerId: customer.id,
        };
      } else {
        user.subscription.stripeCustomerId = customer.id;
      }
      
      await user.save();
      console.log('Stripe customer created:', customer.id);
    }

    // 验证 customer ID 存在
    if (!user.subscription?.stripeCustomerId) {
      console.error('Failed to create or retrieve Stripe customer ID');
      return NextResponse.json({ 
        error: 'Failed to create customer account',
        code: 'CUSTOMER_CREATION_FAILED'
      }, { status: 500 });
    }

    // 开发模式检查：如果 Stripe 密钥未设置，返回模拟响应
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === '') {
      console.log('Development mode: Stripe not configured, returning mock response');
      return NextResponse.json({ 
        error: 'Stripe is not configured. Please set up Stripe environment variables.',
        code: 'STRIPE_NOT_CONFIGURED',
        mockUrl: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/?billing=mock&plan=${plan}`
      }, { status: 503 });
    }

    const successUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/?billing=success`;
    const cancelUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/?billing=cancel`;

    const session = await PerformanceLogger.measurePerformance(
      'stripe_checkout_session_create',
      async () => {
        return await getStripe().checkout.sessions.create({
          mode: 'subscription',
          customer: user.subscription!.stripeCustomerId!,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          allow_promotion_codes: true,
          metadata: { appUserId: user._id.toString(), plan },
        });
      },
      'api',
      { plan, customerId: user.subscription!.stripeCustomerId! }
    );

    // 记录订阅创建尝试日志
    await LoggingService.logSubscription({
      userId: user._id.toString(),
      action: 'created',
      toPlan: plan as 'basic' | 'pro' | 'enterprise',
      stripeEventId: session.id,
      stripeEventType: 'checkout.session.created',
      status: 'pending',
      metadata: {
        sessionId: session.id,
        customerId: user.subscription!.stripeCustomerId!,
        priceId,
      },
    });

    // Log successful checkout session creation
    ApiLogger.logApiSuccess(requestId, 'Checkout session created successfully', {
      sessionId: session.id,
      plan,
      customerId: user.subscription!.stripeCustomerId!
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('checkout error', e);
    ApiLogger.logApiError(requestId, e as Error, { plan: (e as any).plan || 'unknown' });
    
    // 提供更详细的错误信息
    if (e && typeof e === 'object' && 'message' in e) {
      const error = e as any;
      console.error('Error details:', {
        message: error.message,
        type: error.type,
        code: error.code,
        param: error.param,
        statusCode: error.statusCode
      });
      
      // 根据错误类型返回不同的错误信息
      if (error.type === 'StripeInvalidRequestError') {
        if (error.param === 'customer') {
          return NextResponse.json({ 
            error: 'Customer account issue. Please try again.',
            code: 'CUSTOMER_ERROR'
          }, { status: 400 });
        }
        if (error.param === 'price') {
          return NextResponse.json({ 
            error: 'Invalid subscription plan selected.',
            code: 'INVALID_PLAN'
          }, { status: 400 });
        }
      }
    }
    
    return NextResponse.json({ 
      error: 'Checkout session error',
      code: 'CHECKOUT_ERROR'
    }, { status: 500 });
  }
});


