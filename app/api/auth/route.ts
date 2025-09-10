import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { LoggingService } from '@/app/lib/services/LoggingService';

// 创建Google OAuth客户端
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 验证环境变量
function validateEnvironment() {
  const required = ['GOOGLE_CLIENT_ID', 'JWT_SECRET', 'MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// 验证Google ID token
async function verifyGoogleToken(idToken: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token payload');
    }

    // 验证必要字段
    const { sub: googleId, email, name, picture, email_verified } = payload;
    
    if (!googleId || !email || !name) {
      throw new Error('Missing required user information from Google');
    }

    // 验证邮箱是否已验证
    if (!email_verified) {
      throw new Error('Email not verified by Google');
    }

    return {
      googleId,
      email: email.toLowerCase(), // 标准化邮箱格式
      name: name.trim(),
      picture: picture || '',
      emailVerified: email_verified
    };
  } catch (error) {
    console.error('Google token verification failed:', error);
    throw new Error('Invalid Google authentication token');
  }
}

// 创建或更新用户
async function createOrUpdateUser(userData: any) {
  await connectDB();
  
  let user = await User.findOne({ googleId: userData.googleId });
  
  if (user) {
    // 更新现有用户
    user.lastLoginAt = new Date();
    user.updatedAt = new Date();
    
    // 更新用户信息（如果Google返回的信息有变化）
    if (user.email !== userData.email) {
      user.email = userData.email;
    }
    if (user.name !== userData.name) {
      user.name = userData.name;
    }
    if (user.photo !== userData.picture) {
      user.photo = userData.picture;
    }
    
    await user.save();
    
    // 记录登录日志
    await LoggingService.logSubscription({
      userId: user._id.toString(),
      action: 'login',
      status: 'success',
      metadata: {
        loginMethod: 'google',
        email: user.email,
        lastLogin: user.lastLoginAt
      }
    });
  } else {
    // 创建新用户
    user = await User.create({
      email: userData.email,
      name: userData.name,
      photo: userData.picture,
      googleId: userData.googleId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    });
    
    // 记录新用户注册日志
    await LoggingService.logSubscription({
      userId: user._id.toString(),
      action: 'register',
      status: 'success',
      metadata: {
        loginMethod: 'google',
        email: user.email,
        registrationDate: user.createdAt
      }
    });
  }
  
  return user;
}

// 生成JWT token
function generateJWTToken(user: any) {
  const jwtSecret = process.env.JWT_SECRET!;
  
  const tokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    googleId: user.googleId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7天过期
  };
  
  return jwt.sign(tokenPayload, jwtSecret, { 
    expiresIn: '7d',
    issuer: 'ghibli-dreamer',
    audience: 'ghibli-dreamer-users'
  });
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // 验证环境变量
    validateEnvironment();
    
    // 解析请求体
    const body = await request.json();
    const { id_token } = body;
    
    if (!id_token || typeof id_token !== 'string') {
      return NextResponse.json({ 
        error: 'No valid ID token provided',
        code: 'MISSING_TOKEN'
      }, { status: 400 });
    }

    // 验证Google ID token
    const userData = await verifyGoogleToken(id_token);
    
    // 创建或更新用户
    const user = await createOrUpdateUser(userData);
    
    // 生成JWT token
    const token = generateJWTToken(user);
    
    // 准备用户状态
    const userState = {
      freeTrialsRemaining: user.usage?.freeTrialsRemaining || 0,
      totalTransformations: user.usage?.totalTransformations || 0,
      subscriptionPlan: user.subscription?.plan || 'free',
      isSubscriptionActive: user.subscription?.isActive || false,
      isAdmin: user.isAdmin || false
    };

    // 记录成功响应时间
    const responseTime = Date.now() - startTime;
    console.log(`Google login successful for user ${user.email} in ${responseTime}ms`);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        photo: user.photo,
      },
      userState,
      expiresIn: 7 * 24 * 60 * 60 // 7天，以秒为单位
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Auth error:', error);
    
    // 记录错误日志
    try {
      await LoggingService.logSubscription({
        userId: 'unknown',
        action: 'login',
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.error('Failed to log auth error:', logError);
    }
    
    // 根据错误类型返回不同的状态码
    if (error instanceof Error) {
      if (error.message.includes('Invalid Google') || error.message.includes('Missing required')) {
        return NextResponse.json({ 
          error: 'Invalid Google authentication',
          code: 'INVALID_GOOGLE_TOKEN'
        }, { status: 401 });
      }
      
      if (error.message.includes('environment variables')) {
        return NextResponse.json({ 
          error: 'Server configuration error',
          code: 'CONFIG_ERROR'
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    }, { status: 500 });
  }
}
