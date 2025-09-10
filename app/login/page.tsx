"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { tokenManager } from '@/app/lib/tokenManager';
import { withRetry } from '@/app/lib/retryUtils';

// Google OAuth 类型定义
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, config: {
            theme: string;
            size: string;
            text: string;
            shape: string;
            width: number;
            type: string;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface LoginState {
  isLoading: boolean;
  error: string | null;
  retryCount: number;
  isGoogleLoaded: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [loginState, setLoginState] = useState<LoginState>({
    isLoading: false,
    error: null,
    retryCount: 0,
    isGoogleLoaded: false
  });
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // 更新登录状态
  const updateLoginState = (updates: Partial<LoginState>) => {
    setLoginState(prev => ({ ...prev, ...updates }));
  };

  // 处理Google登录
  const handleGoogleLogin = async (credential: string) => {
    updateLoginState({ isLoading: true, error: null });
    
    try {
      const result = await withRetry(async () => {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: credential })
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Authentication failed');
        }
        
        return res.json();
      }, {
        maxAttempts: 3,
        delay: 1000,
        shouldRetry: (error) => {
          // 重试网络错误和服务器错误
          return error instanceof TypeError || 
                 (error.message && error.message.includes('fetch')) ||
                 error.message.includes('Network') ||
                 error.message.includes('timeout');
        }
      });
      
      if (result.success && result.data) {
        const data = result.data;
        if (data.success && data.token) {
          // 使用token管理器存储用户状态
          tokenManager.storeUserData(data.token, data.user, data.userState);
          
          // 重定向到首页
          router.push('/');
        } else {
          throw new Error(data.error || '登录失败');
        }
      } else {
        throw result.error || new Error('登录失败');
      }
    } catch (e) {
      console.error('Auth error:', e);
      const errorMessage = e instanceof Error ? e.message : '登录失败';
      updateLoginState({ 
        error: errorMessage,
        retryCount: loginState.retryCount + 1
      });
    } finally {
      updateLoginState({ isLoading: false });
    }
  };

  // 重试登录
  const retryLogin = () => {
    updateLoginState({ error: null, retryCount: 0 });
    // 重新初始化Google登录
    if (window.google && googleBtnRef.current) {
      initializeGoogleAuth();
    }
  };

  // 初始化Google认证
  const initializeGoogleAuth = () => {
    if (!window.google || !googleBtnRef.current) return;
    
    try {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) {
            updateLoginState({ error: 'Google 未返回 ID token' });
            return;
          }
          await handleGoogleLogin(response.credential);
        }
      });

      // 渲染Google登录按钮
      window.google.accounts.id.renderButton(
        googleBtnRef.current,
        {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 300,
          type: 'standard'
        }
      );
    } catch (error) {
      console.error('Google auth initialization error:', error);
      updateLoginState({ error: 'Google登录初始化失败' });
    }
  };

  // 加载Google脚本
  const loadGoogleScript = () => {
    // 检查是否已经加载
    if (scriptRef.current) return;
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google OAuth script loaded');
      updateLoginState({ isGoogleLoaded: true });
      initializeGoogleAuth();
    };
    
    script.onerror = () => {
      updateLoginState({ error: '无法加载Google登录脚本，请检查网络连接' });
    };
    
    document.head.appendChild(script);
    scriptRef.current = script;
  };

  useEffect(() => {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      updateLoginState({ error: 'Google客户端ID未配置' });
      return;
    }

    // 加载Google脚本
    loadGoogleScript();

    return () => {
      // 清理脚本
      if (scriptRef.current && document.head.contains(scriptRef.current)) {
        document.head.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFFE5] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <span className="w-16 h-16 bg-[#FFFFE5] rounded-full flex items-center justify-center">
              <Image
                src="/images/icons/use1.png"
                alt="Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">欢迎回来</h1>
          <p className="text-gray-600 mt-2">请登录您的账号</p>
        </div>

        {/* 错误提示 */}
        {loginState.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="font-medium">登录失败</p>
                <p className="mt-1">{loginState.error}</p>
                {loginState.retryCount > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    重试次数: {loginState.retryCount}
                  </p>
                )}
              </div>
            </div>
            {loginState.retryCount < 3 && (
              <div className="mt-3">
                <button
                  onClick={retryLogin}
                  className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
                >
                  重试
                </button>
              </div>
            )}
          </div>
        )}

        {/* 加载状态 */}
        {loginState.isLoading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium">正在登录...</p>
                <p className="text-xs">请稍候，正在验证您的身份</p>
              </div>
            </div>
          </div>
        )}

        {/* Google登录按钮容器 */}
        <div className="mb-4">
          {!loginState.isGoogleLoaded && !loginState.error && (
            <div className="flex justify-center items-center h-12 bg-gray-100 rounded-lg">
              <div className="flex items-center text-gray-500">
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">正在加载Google登录...</span>
              </div>
            </div>
          )}
          <div ref={googleBtnRef} className="flex justify-center"></div>
        </div>

        {/* 备用登录选项 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-3">其他登录方式</p>
          <div className="space-y-2">
            <button
              onClick={async () => {
                updateLoginState({ isLoading: true, error: null });
                try {
                  // 调用管理员登录API
                  const response = await fetch('/api/auth/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      mode: 'admin',
                      email: 'admin@example.com'
                    })
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '管理员登录失败');
                  }
                  
                  const data = await response.json();
                  if (data.token) {
                    // 使用token管理器存储管理员用户状态
                    tokenManager.storeUserData(data.token, data.user, data.userState);
                    
                    // 重定向到首页
                    router.push('/');
                  } else {
                    throw new Error(data.error || '管理员登录失败');
                  }
                } catch (e) {
                  console.error('Admin login error:', e);
                  updateLoginState({ 
                    error: e instanceof Error ? e.message : '管理员登录失败'
                  });
                } finally {
                  updateLoginState({ isLoading: false });
                }
              }}
              disabled={loginState.isLoading}
              className="w-full text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-4 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔑 管理员测试登录
            </button>
            
            <button
              onClick={() => {
                updateLoginState({ isLoading: true, error: null });
                try {
                  // 模拟登录功能作为备用
                  const mockUser = {
                    id: 'mock_user_123',
                    email: 'test@example.com',
                    name: '测试用户',
                    photo: '/images/icons/use1.png'
                  };
                  const mockUserState = {
                    freeTrialsRemaining: 5,
                    totalTransformations: 0,
                    subscriptionPlan: 'free',
                    isSubscriptionActive: false,
                    isAdmin: false
                  };
                  // 生成一个有效的JWT token用于测试
                  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzQ3OTg4MywiZXhwIjoxNzU4MDg0NjgzLCJhdWQiOiJnaGlibGktZHJlYW1lci11c2VycyIsImlzcyI6ImdoaWJsaS1kcmVhbWVyIn0.1Zh6dTAQ92FE0RMTSVSrbxNRx21u6F6wUezFmOsNwLY';
                  // 使用token管理器存储测试用户状态
                  tokenManager.storeUserData(mockToken, mockUser, mockUserState);
                  router.push('/');
                } catch (e) {
                  updateLoginState({ 
                    error: e instanceof Error ? e.message : '测试登录失败'
                  });
                } finally {
                  updateLoginState({ isLoading: false });
                }
              }}
              disabled={loginState.isLoading}
              className="w-full text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🧪 普通用户测试登录
            </button>
          </div>
          
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-400">
              这些是开发测试选项，生产环境中应该移除
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}