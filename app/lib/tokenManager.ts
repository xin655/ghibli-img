/**
 * Token管理工具
 * 用于处理JWT token的存储、验证和刷新
 */

export interface TokenInfo {
  token: string;
  expiresAt: number;
  userId: string;
  email: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  photo: string;
}

export interface UserState {
  freeTrialsRemaining: number;
  totalTransformations: number;
  subscriptionPlan: string;
  isSubscriptionActive: boolean;
  isAdmin: boolean;
}

class TokenManager {
  private static instance: TokenManager;
  private refreshPromise: Promise<string> | null = null;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * 存储用户数据到localStorage
   */
  storeUserData(token: string, user: UserInfo, userState: UserState): void {
    try {
      // 解析token获取过期时间
      const payload = this.parseToken(token);
      const expiresAt = payload ? payload.exp * 1000 : Date.now() + (7 * 24 * 60 * 60 * 1000);

      localStorage.setItem('jwt', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userState', JSON.stringify(userState));
      localStorage.setItem('tokenExpiresAt', expiresAt.toString());
      
      console.log('User data stored successfully');
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }

  /**
   * 获取当前token
   */
  getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  /**
   * 获取用户信息
   */
  getUser(): UserInfo | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  }

  /**
   * 获取用户状态
   */
  getUserState(): UserState | null {
    try {
      const userStateStr = localStorage.getItem('userState');
      return userStateStr ? JSON.parse(userStateStr) : null;
    } catch (error) {
      console.error('Failed to parse user state:', error);
      return null;
    }
  }

  /**
   * 检查用户是否已登录
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // 检查token是否过期
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (expiresAt) {
      const expiryTime = parseInt(expiresAt);
      if (Date.now() > expiryTime) {
        this.clearUserData();
        return false;
      }
    }

    return true;
  }

  /**
   * 检查token是否需要刷新
   */
  shouldRefreshToken(): boolean {
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return false;

    const expiryTime = parseInt(expiresAt);
    const timeUntilExpiry = expiryTime - Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24小时

    return timeUntilExpiry < oneDay && timeUntilExpiry > 0;
  }

  /**
   * 刷新token
   */
  async refreshToken(): Promise<string | null> {
    // 防止重复刷新
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      if (data.success && data.token) {
        // 更新存储的token
        const currentUser = this.getUser();
        const currentUserState = this.getUserState();
        
        if (currentUser && currentUserState) {
          this.storeUserData(data.token, currentUser, currentUserState);
        }
        
        console.log('Token refreshed successfully');
        return data.token;
      }
      
      throw new Error('Invalid refresh response');
    } catch (error) {
      console.error('Token refresh failed:', error);
      // 刷新失败，清除用户数据
      this.clearUserData();
      return null;
    }
  }

  /**
   * 获取带认证头的请求配置
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    let token = this.getToken();
    
    if (!token) {
      return {};
    }

    // 检查是否需要刷新token
    if (this.shouldRefreshToken()) {
      const newToken = await this.refreshToken();
      if (newToken) {
        token = newToken;
      }
    }

    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * 刷新用户状态
   */
  async refreshUserStatus(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch('/api/user/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user status');
      }

      const data = await response.json();
      if (data.success) {
        // 更新存储的用户状态
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userState', JSON.stringify(data.userState));
        console.log('✅ 用户状态已刷新');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to refresh user status:', error);
      return false;
    }
  }

  /**
   * 开始自动刷新用户状态
   */
  startAutoRefresh(intervalMs: number = 30000): void {
    // 清除现有的定时器
    this.stopAutoRefresh();
    
    // 设置新的定时器
    (this as any).refreshInterval = setInterval(() => {
      this.refreshUserStatus();
    }, intervalMs);
    
    console.log(`🔄 已启动自动刷新用户状态，间隔: ${intervalMs}ms`);
  }

  /**
   * 停止自动刷新用户状态
   */
  stopAutoRefresh(): void {
    if ((this as any).refreshInterval) {
      clearInterval((this as any).refreshInterval);
      (this as any).refreshInterval = null;
      console.log('⏹️ 已停止自动刷新用户状态');
    }
  }

  /**
   * 解析JWT token（不验证签名）
   */
  private parseToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to parse token:', error);
      return null;
    }
  }

  /**
   * 清除所有用户数据
   */
  clearUserData(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    localStorage.removeItem('userState');
    localStorage.removeItem('tokenExpiresAt');
    console.log('User data cleared');
  }

  /**
   * 获取token剩余时间（毫秒）
   */
  getTokenTimeRemaining(): number {
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return 0;
    
    const expiryTime = parseInt(expiresAt);
    return Math.max(0, expiryTime - Date.now());
  }

  /**
   * 格式化剩余时间
   */
  formatTimeRemaining(): string {
    const remaining = this.getTokenTimeRemaining();
    if (remaining <= 0) return '已过期';
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  }
}

// 导出单例实例
export const tokenManager = TokenManager.getInstance();

// 导出类型
export type { TokenInfo, UserInfo, UserState };
