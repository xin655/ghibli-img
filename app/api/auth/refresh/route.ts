import { NextResponse } from 'next/server';
import { verifyToken, generateToken } from '@/app/lib/auth';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import { LoggingService } from '@/app/lib/services/LoggingService';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return NextResponse.json({ 
        error: 'No token provided',
        code: 'MISSING_TOKEN'
      }, { status: 401 });
    }

    // 验证当前token
    const authResult = verifyToken(token);
    if (!authResult.isValid || !authResult.payload) {
      return NextResponse.json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      }, { status: 401 });
    }

    // 检查用户是否仍然存在
    await connectDB();
    const user = await User.findById(authResult.payload.userId);
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    // 生成新token
    const newToken = generateToken(
      user._id.toString(),
      user.email,
      user.googleId
    );

    // 记录token刷新日志
    await LoggingService.logSubscription({
      userId: user._id.toString(),
      action: 'token_refresh',
      status: 'success',
      metadata: {
        oldTokenExp: authResult.payload.exp,
        newTokenExp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      }
    });

    return NextResponse.json({
      success: true,
      token: newToken,
      expiresIn: 7 * 24 * 60 * 60 // 7天，以秒为单位
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    // 记录错误日志
    try {
      await LoggingService.logSubscription({
        userId: 'unknown',
        action: 'token_refresh',
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.error('Failed to log token refresh error:', logError);
    }
    
    return NextResponse.json({ 
      error: 'Token refresh failed',
      code: 'REFRESH_FAILED'
    }, { status: 500 });
  }
}
