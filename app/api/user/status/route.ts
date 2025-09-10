import { NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/app/lib/auth';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';

export async function GET(req: Request) {
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

    // 连接数据库并获取用户信息
    await connectDB();
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 准备用户状态
    const userState = {
      freeTrialsRemaining: user.usage?.freeTrialsRemaining || 0,
      totalTransformations: user.usage?.totalTransformations || 0,
      subscriptionPlan: user.subscription?.plan || 'free',
      isSubscriptionActive: user.subscription?.isActive || false,
      isAdmin: user.isAdmin || false,
      subscriptionDetails: user.subscription ? {
        plan: user.subscription.plan,
        isActive: user.subscription.isActive,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
        stripeCustomerId: user.subscription.stripeCustomerId,
        stripeSubscriptionId: user.subscription.stripeSubscriptionId
      } : null
    };

    // 准备用户信息
    const userInfo = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      photo: user.photo,
    };

    return NextResponse.json({
      success: true,
      user: userInfo,
      userState,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('User status error:', error);
    return NextResponse.json({ 
      error: 'Failed to get user status',
      code: 'STATUS_ERROR'
    }, { status: 500 });
  }
}
