import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
  googleId: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  isValid: boolean;
  payload?: TokenPayload;
  error?: string;
}

/**
 * 验证JWT token
 */
export function verifyToken(token: string): AuthResult {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return {
        isValid: false,
        error: 'JWT_SECRET not configured'
      };
    }

    const payload = jwt.verify(token, jwtSecret, {
      issuer: 'ghibli-dreamer',
      audience: 'ghibli-dreamer-users'
    }) as TokenPayload;

    // 检查token是否过期
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return {
        isValid: false,
        error: 'Token expired'
      };
    }

    return {
      isValid: true,
      payload
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid token'
    };
  }
}

/**
 * 从请求头中提取token
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * 生成新的JWT token
 */
export function generateToken(userId: string, email: string, googleId: string): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload = {
    userId,
    email,
    googleId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7天
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: '7d',
    issuer: 'ghibli-dreamer',
    audience: 'ghibli-dreamer-users'
  });
}

/**
 * 检查token是否需要刷新（在过期前24小时）
 */
export function shouldRefreshToken(payload: TokenPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - now;
  const oneDay = 24 * 60 * 60; // 24小时
  
  return timeUntilExpiry < oneDay;
}

/**
 * 获取token剩余有效时间（秒）
 */
export function getTokenTimeRemaining(payload: TokenPayload): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}

/**
 * 格式化剩余时间
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}分钟`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}小时`;
  } else {
    return `${Math.floor(seconds / 86400)}天`;
  }
}
