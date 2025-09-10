import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { Types } from 'mongoose';

export const runtime = 'nodejs';

// 管理员登录API
export async function POST(req: Request) {
  try {
    const { mode, email } = await req.json();

    // 只在开发模式下允许管理员登录
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Admin login only available in development mode' }, { status: 403 });
    }

    if (mode !== 'admin') {
      return NextResponse.json({ error: 'Invalid login mode' }, { status: 400 });
    }

    await connectDB();

    // 检查管理员邮箱
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@example.com'];
    if (!adminEmails.includes(email)) {
      return NextResponse.json({ error: 'Email not authorized for admin access' }, { status: 403 });
    }

    console.log(`🔑 管理员登录尝试: ${email}`);

    // 查找或创建管理员用户
    let user = await User.findOne({ email });
    
    if (!user) {
      // 创建新的管理员用户
      user = await User.create({
        email: email,
        name: 'Admin User',
        photo: '',
        googleId: `admin_${Date.now()}`,
        isAdmin: true,
        usage: {
          freeTrialsRemaining: -1, // 无限制使用
          totalTransformations: 0
        },
        subscription: {
          isActive: true,
          plan: 'enterprise',
          stripeCustomerId: 'admin_customer',
          stripeSubscriptionId: 'admin_subscription',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年后
        }
      });
      console.log(`✅ 创建新的管理员用户: ${email}`);
    } else {
      // 更新现有用户为管理员权限
      user.isAdmin = true;
      user.usage.freeTrialsRemaining = -1; // 无限制使用
      user.subscription = {
        isActive: true,
        plan: 'enterprise',
        stripeCustomerId: user.subscription?.stripeCustomerId || 'admin_customer',
        stripeSubscriptionId: user.subscription?.stripeSubscriptionId || 'admin_subscription',
        currentPeriodEnd: user.subscription?.currentPeriodEnd || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };
      await user.save();
      console.log(`✅ 更新现有用户为管理员: ${email}`);
    }

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        googleId: user.googleId,
        isAdmin: true
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { 
        expiresIn: '7d',
        issuer: 'ghibli-dreamer',
        audience: 'ghibli-dreamer-users'
      }
    );

    // 准备用户状态
    const userState = {
      freeTrialsRemaining: user.usage.freeTrialsRemaining,
      totalTransformations: user.usage.totalTransformations,
      subscriptionPlan: user.subscription?.plan || 'enterprise',
      isSubscriptionActive: user.subscription?.isActive || true,
      isAdmin: true
    };

    // 准备用户信息
    const userInfo = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      photo: user.photo
    };

    console.log(`🎉 管理员登录成功: ${email}`);

    return NextResponse.json({
      success: true,
      token,
      user: userInfo,
      userState,
      message: 'Admin login successful'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ 
      error: 'Admin login failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

