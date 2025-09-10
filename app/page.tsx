"use client";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { CONFIG } from './config/constants';
import Link from "next/link";
import ConversionPrompt from './components/ConversionPrompt';
import UsageStats from './components/UsageStats';
import ErrorBoundary from './components/ErrorBoundary';
import UserGuide from './components/UserGuide';
import StyleRecommendation from './components/StyleRecommendation';
import ProgressIndicator, { ProgressManager } from './components/ProgressIndicator';
import { tokenManager } from './lib/tokenManager';
import { ErrorHandler, RetryManager } from './lib/errorHandler';

const STYLES = [
  { label: "Ghibli Style", value: "ghibli" },
  { label: "Watercolor", value: "watercolor" },
  { label: "Comic", value: "comic" },
  { label: "Anime", value: "anime" },
];

interface LoggedInUser {
  id: string;
  email: string;
  name: string;
  photo: string;
}

interface UserState {
  freeTrialsRemaining: number;
  totalTransformations: number;
}

export default function Home() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('ghibli');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [conversionPromptDismissed, setConversionPromptDismissed] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [progressState, setProgressState] = useState(ProgressManager.getState());

  // 检查用户登录状态
  useEffect(() => {
    // 确保在客户端运行
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('jwt');
      const userData = localStorage.getItem('user');
      const userStateData = localStorage.getItem('userState');
      
      if (token && userData) {
        try {
          setUser(JSON.parse(userData));
          if (userStateData) {
            setUserState(JSON.parse(userStateData));
          }
          
          // 启动自动刷新用户状态
          tokenManager.startAutoRefresh(30000); // 每30秒刷新一次
        } catch (error) {
          console.error('Error parsing user data:', error);
          // 清除无效数据
          localStorage.removeItem('jwt');
          localStorage.removeItem('user');
          localStorage.removeItem('userState');
        }
      }

      // 启动网络状态监控
      const cleanupNetworkMonitoring = ErrorHandler.handleNetworkStatus();
      
      // 检查是否是首次访问
      const hasVisited = localStorage.getItem('hasVisited');
      const guideSkipped = localStorage.getItem('userGuideSkipped');
      setIsFirstTime(!hasVisited && !guideSkipped);
      
      // 监听进度管理器状态变化
      const removeProgressListener = ProgressManager.addListener(() => {
        setProgressState(ProgressManager.getState());
      });
      
      // 清理函数
      return () => {
        tokenManager.stopAutoRefresh();
        cleanupNetworkMonitoring();
        removeProgressListener();
      };
    }
  }, []);

  // 处理订阅成功/取消回调
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const billing = params.get('billing');
      
      if (billing === 'success') {
        console.log('🎉 订阅成功，刷新用户状态...');
        // 延迟刷新，等待webhook处理完成
        setTimeout(() => {
          refreshUserStatus();
        }, 2000);
        
        // 显示成功提示
        alert('🎉 订阅成功！您的账户已升级，请稍候页面将自动更新。');
        
        // 清除URL参数
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (billing === 'cancel') {
        console.log('❌ 订阅已取消');
        alert('订阅已取消，您可以随时重新订阅。');
        
        // 清除URL参数
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // 处理点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    if (avatarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [avatarMenuOpen]);

  // 处理图片转换
  async function handleTransform() {
    if (!selectedFile) {
      const error = ErrorHandler.handleApiError(new Error('Please select an image first'));
      ErrorHandler.showErrorToast(error);
      return;
    }

    // 检查免费次数限制
    if (!user) {
      const currentCount = typeof window !== 'undefined' 
        ? parseInt(localStorage.getItem('unauthenticatedFreeCount') || '0')
        : 0;
      if (currentCount >= CONFIG.FREE_TRIAL.UNAUTHENTICATED_USER_LIMIT) {
        const error = ErrorHandler.handleApiError(new Error('免费次数已用完，请登录继续使用'));
        ErrorHandler.showErrorToast(error);
        return;
      }
    } else if (userState && userState.freeTrialsRemaining <= 0) {
      const error = ErrorHandler.handleApiError(new Error('免费次数已用完'));
      ErrorHandler.showErrorToast(error);
      return;
    }

    if (!uploadedUrl) {
      const error = ErrorHandler.handleApiError(new Error('Please upload an image first'));
      ErrorHandler.showErrorToast(error);
      return;
    }

    setIsTransforming(true);
    setTransformError(null);

    // 显示转换进度
    ProgressManager.simulateProgress([
      { message: '准备转换', subMessage: '正在分析图片内容...', duration: 1000 },
      { message: 'AI 处理中', subMessage: '正在应用艺术风格...', duration: 2000 },
      { message: '生成结果', subMessage: '正在优化图片质量...', duration: 1000 }
    ]);

    try {
      await RetryManager.withRetry(
        async () => {
          const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch('/api/transform', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              imageUrl: uploadedUrl,
              style: selectedStyle,
              prompt: `Transform this image into ${selectedStyle} style`
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to transform image');
          }

          const data = await response.json();
          setResultUrl(data.transformedUrl);
          
          // 触发下载引导
          if (isFirstTime) {
            setTimeout(() => setCurrentGuideStep('download'), 1000);
          }

          // 更新使用次数
          if (!user && typeof window !== 'undefined') {
            const newCount = parseInt(localStorage.getItem('unauthenticatedFreeCount') || '0') + 1;
            localStorage.setItem('unauthenticatedFreeCount', newCount.toString());
          } else if (userState && typeof window !== 'undefined') {
            const newUserState = {
              ...userState,
              freeTrialsRemaining: userState.freeTrialsRemaining - 1,
              totalTransformations: userState.totalTransformations + 1
            };
            setUserState(newUserState);
            localStorage.setItem('userState', JSON.stringify(newUserState));
          }
        },
        'transform-image',
        (attempt) => {
          console.log(`Transform retry attempt ${attempt}`);
        }
      );
    } catch (error) {
      console.error('Transform error:', error);
      const userFriendlyError = ErrorHandler.handleApiError(error);
      ErrorHandler.showErrorToast(userFriendlyError, handleTransform);
      setTransformError(userFriendlyError.message);
    } finally {
      setIsTransforming(false);
    }
  }

  // 处理文件选择
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 重置状态
    setUploadError(null);
    setResultUrl(null);
    setUploadedUrl(null);

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // 验证文件大小 (最大5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size should be less than 5MB');
      return;
    }

    // 创建预览URL
    const previewUrl = URL.createObjectURL(file);
    setPreviewUrl(previewUrl);
    setSelectedFile(file);

    // 触发上传引导
    if (isFirstTime) {
      setCurrentGuideStep('upload');
    }

    // 自动上传文件
    await handleUpload(file);
  }

  // 处理文件上传
  async function handleUpload(file: File) {
    setIsUploading(true);
    setUploadError(null);

    try {
      await RetryManager.withRetry(
        async () => {
          const formData = new FormData();
          formData.append('file', file);

          const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
          const headers: HeadersInit = {};
          
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers,
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload image');
          }

          const data = await response.json();
          setUploadedUrl(data.url);
          
          // 触发风格选择引导
          if (isFirstTime) {
            setTimeout(() => setCurrentGuideStep('style'), 1000);
          }
        },
        'upload-file',
        (attempt) => {
          console.log(`Upload retry attempt ${attempt}`);
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      const userFriendlyError = ErrorHandler.handleApiError(error);
      ErrorHandler.showErrorToast(userFriendlyError, () => handleUpload(file));
      setUploadError(userFriendlyError.message);
    } finally {
      setIsUploading(false);
    }
  }

  // 处理上传点击
  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  // 处理下载
  async function handleDownload() {
    if (!resultUrl) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ imageUrl: resultUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download image');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ghibli-transformed-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Download error:', error);
      setDownloadError(error instanceof Error ? error.message : 'Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  }

  // 手动刷新用户状态
  async function refreshUserStatus() {
    try {
      const success = await tokenManager.refreshUserStatus();
      if (success) {
        // 重新获取用户数据
        const userData = localStorage.getItem('user');
        const userStateData = localStorage.getItem('userState');
        
        if (userData) {
          setUser(JSON.parse(userData));
        }
        if (userStateData) {
          setUserState(JSON.parse(userStateData));
        }
        
        console.log('✅ 用户状态已手动刷新');
      }
    } catch (error) {
      console.error('Failed to refresh user status:', error);
    }
  }

  // 处理登出
  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
      localStorage.removeItem('userState');
    }
    setUser(null);
    setUserState(null);
    setAvatarMenuOpen(false);
    tokenManager.stopAutoRefresh();
  }

  // 获取剩余免费次数
  function getRemainingFreeCount() {
    if (user && userState) {
      return userState.freeTrialsRemaining;
    } else {
      const used = typeof window !== 'undefined' 
        ? parseInt(localStorage.getItem('unauthenticatedFreeCount') || '0')
        : 0;
      return Math.max(0, CONFIG.FREE_TRIAL.UNAUTHENTICATED_USER_LIMIT - used);
    }
  }

  // 获取总免费次数
  function getTotalFreeCount() {
    if (user && userState) {
      return CONFIG.FREE_TRIAL.AUTHENTICATED_USER_LIMIT;
    } else {
      return CONFIG.FREE_TRIAL.UNAUTHENTICATED_USER_LIMIT;
    }
  }

  // 处理升级按钮点击
  function handleUpgrade() {
    setShowUpgradeModal(true);
  }

  // 处理转化提示关闭
  function handleConversionPromptDismiss() {
    setConversionPromptDismissed(true);
    // 可以在这里添加其他逻辑，比如记录用户行为
  }

  // 处理风格推荐
  function handleStyleRecommendation(recommendedStyle: string) {
    setSelectedStyle(recommendedStyle);
    // 触发转换引导
    if (isFirstTime) {
      setTimeout(() => setCurrentGuideStep('transform'), 1000);
    }
  }

  // 处理引导完成
  function handleGuideComplete() {
    setCurrentGuideStep(null);
    localStorage.setItem('userGuideCompleted', 'true');
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen ghibli-gradient-bg">
      {/* Header */}
      <header className="ghibli-card-gradient shadow-lg border-b border-white/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image
                src="/images/icons/use1.png"
                alt="Ghibli Dreamer"
                width={32}
                height={32}
                className="mr-3"
              />
              <h1 className="text-xl font-bold text-[var(--ghibli-primary)] animate-fade-in">Ghibli Dreamer</h1>
          </div>

            <div className="flex items-center space-x-4">
              {user ? (
                <div className="relative" ref={avatarRef}>
                  <button
                    onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                    className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Image
                      src={user.photo || '/images/icons/use1.png'}
                      alt={user.name}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <span className="text-gray-700">{user.name}</span>
                  </button>

                  {avatarMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        <div>剩余免费次数: {getRemainingFreeCount()}</div>
                        {userState?.isSubscriptionActive && (
                          <div className="text-green-600 text-xs mt-1">
                            ✅ {userState.subscriptionPlan.toUpperCase()} 订阅活跃
                          </div>
                        )}
                        {userState?.isAdmin && (
                          <div className="text-purple-600 text-xs mt-1">
                            👑 管理员权限
                          </div>
                        )}
                      </div>
                      
                      {/* 订阅管理按钮 */}
                      {userState?.isSubscriptionActive && (
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('jwt');
                              const res = await fetch('/api/billing/portal', {
                                method: 'POST',
                                headers: {
                                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                },
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Failed to open portal');
                              if (data.url) window.location.href = data.url;
                            } catch (e) {
                              alert(e instanceof Error ? e.message : '打开订阅管理失败');
                            }
                          }}
                          className="block px-4 py-2 text-sm text-indigo-600 hover:bg-gray-100 w-full text-left"
                        >
                          🔧 管理订阅
                        </button>
                      )}
                      
                      {/* 订阅页面链接 */}
                      <Link
                        href="/subscription"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={() => setAvatarMenuOpen(false)}
                      >
                        📊 订阅详情
                      </Link>
                      
                      {/* 订单历史链接 */}
                      <Link
                        href="/orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                        onClick={() => setAvatarMenuOpen(false)}
                      >
                        📋 订单历史
                      </Link>
                      
                      {/* 管理员功能 */}
                      {userState?.isAdmin && (
                        <>
                          <div className="border-t border-gray-200 my-1"></div>
                          <Link
                            href="/analytics"
                            className="block px-4 py-2 text-sm text-purple-600 hover:bg-gray-100 w-full text-left"
                            onClick={() => setAvatarMenuOpen(false)}
                          >
                            📊 数据分析
                          </Link>
                          <Link
                            href="/analytics"
                            className="block px-4 py-2 text-sm text-purple-600 hover:bg-gray-100 w-full text-left"
                            onClick={() => setAvatarMenuOpen(false)}
                          >
                            👥 用户管理
                          </Link>
                        </>
                      )}
                      
                      <button
                        onClick={handleLogout}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        登出
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    免费体验次数: {getRemainingFreeCount()}/{CONFIG.FREE_TRIAL.UNAUTHENTICATED_USER_LIMIT}
                  </span>
                  <Link
                    href="/login"
                    className="ghibli-button-gradient text-white px-4 py-2 rounded-md text-sm font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                  >
                    登录
                  </Link>
            </div>
              )}
            </div>
          </div>
        </div>
          </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-[var(--ghibli-primary)] mb-4 animate-float">
            将您的照片转换为吉卜力风格
          </h2>
          <p className="text-lg text-[var(--ghibli-secondary)] max-w-2xl mx-auto">
            上传您的图片，选择风格，让AI为您创造神奇的艺术作品
          </p>
        </div>

        {/* 使用统计组件 */}
        <UsageStats
          remainingCount={getRemainingFreeCount()}
          totalCount={getTotalFreeCount()}
          isAuthenticated={!!user}
          onUpgrade={handleUpgrade}
          subscriptionPlan={userState?.subscriptionPlan || 'free'}
          isSubscriptionActive={userState?.isSubscriptionActive || false}
          totalTransformations={userState?.totalTransformations || 0}
        />

        {/* 风格推荐组件 */}
        {uploadedUrl && (
          <StyleRecommendation
            imageUrl={uploadedUrl}
            onRecommendation={handleStyleRecommendation}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="ghibli-card-gradient rounded-xl shadow-xl p-6 border border-white/30 animate-fade-in">
            <h3 className="text-xl font-semibold mb-4 text-[var(--ghibli-primary)]">上传图片</h3>
            
            <div
              data-guide="upload-area"
              onClick={handleUploadClick}
              className="border-2 border-dashed border-[var(--ghibli-primary)]/30 rounded-lg p-8 text-center cursor-pointer hover:border-[var(--ghibli-primary)] hover:bg-[var(--ghibli-cloud)]/20 transition-all duration-300 transform hover:scale-[1.02]"
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <Image
                    src={previewUrl} 
                    alt="Preview"
                    width={300}
                    height={300}
                    className="mx-auto rounded-lg object-cover"
                  />
                  <p className="text-sm text-gray-600">点击更换图片</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-gray-400">
                    <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg text-[var(--ghibli-primary)]">点击上传图片</p>
                    <p className="text-sm text-[var(--ghibli-secondary)]">支持 JPG, PNG, GIF (最大 5MB)</p>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {uploadError && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {uploadError}
              </div>
            )}

            {isUploading && (
              <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded-lg text-sm">
                正在上传...
              </div>
            )}

            {/* Style Selection */}
            <div className="mt-6" data-guide="style-selection">
              <h4 className="text-lg font-medium mb-3 text-[var(--ghibli-primary)]">选择风格</h4>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setSelectedStyle(style.value)}
                    className={`p-3 text-sm font-medium rounded-lg border transition-all duration-300 transform hover:scale-105 ${
                      selectedStyle === style.value
                        ? 'ghibli-button-gradient text-white border-[var(--ghibli-primary)] shadow-lg'
                        : 'bg-white/80 text-[var(--ghibli-primary)] border-[var(--ghibli-primary)]/30 hover:bg-[var(--ghibli-cloud)]/50 hover:border-[var(--ghibli-primary)]'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transform Button */}
            <button
              data-guide="transform-button"
              onClick={handleTransform}
              disabled={!selectedFile || isTransforming || isUploading}
              className="w-full mt-6 ghibli-button-gradient text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
            >
              {isTransforming ? '正在转换...' : '开始转换'}
            </button>

            {transformError && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {transformError}
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="ghibli-card-gradient rounded-xl shadow-xl p-6 border border-white/30 animate-fade-in">
            <h3 className="text-xl font-semibold mb-4 text-[var(--ghibli-primary)]">转换结果</h3>
            
            <div className="border-2 border-[var(--ghibli-primary)]/20 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center bg-[var(--ghibli-cloud)]/10">
              {resultUrl ? (
                <div className="space-y-4 w-full">
                  <Image
                    src={resultUrl}
                    alt="Transformed"
                    width={300}
                    height={300}
                    className="mx-auto rounded-lg object-cover"
                  />
                  <button
                    data-guide="download-button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-600 hover:to-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 shadow-lg"
                  >
                    {isDownloading ? '正在下载...' : '下载图片'}
                  </button>
            </div>
              ) : (
                <div className="text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg text-[var(--ghibli-secondary)]">转换后的图片将显示在这里</p>
          </div>
              )}
            </div>

            {downloadError && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {downloadError}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 用户引导组件 */}
      {currentGuideStep && (
        <UserGuide
          step={currentGuideStep as any}
          isFirstTime={isFirstTime}
          onComplete={handleGuideComplete}
        />
      )}

      {/* 进度指示器 */}
      <ProgressIndicator
        isVisible={progressState.isVisible}
        progress={progressState.progress}
        message={progressState.message}
        subMessage={progressState.subMessage}
      />

      {/* 转化提示组件 */}
      <ConversionPrompt
        remainingCount={getRemainingFreeCount()}
        totalCount={getTotalFreeCount()}
        isAuthenticated={!!user}
        onUpgrade={handleUpgrade}
        onDismiss={handleConversionPromptDismiss}
        subscriptionPlan={userState?.subscriptionPlan || 'free'}
        isSubscriptionActive={userState?.isSubscriptionActive || false}
        totalTransformations={userState?.totalTransformations || 0}
      />

      {/* 升级模态框 */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="ghibli-card-gradient rounded-xl p-6 max-w-md w-full mx-4 border border-white/30 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[var(--ghibli-primary)]">选择您的套餐</h3>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {Object.entries(CONFIG.SUBSCRIPTION.PLANS).map(([key, plan]) => (
                <div key={key} className="border border-[var(--ghibli-primary)]/20 rounded-lg p-4 hover:border-[var(--ghibli-primary)] hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] bg-white/50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{plan.name}</h4>
                    <span className="text-lg font-bold text-[var(--ghibli-primary)]">${plan.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {plan.conversions === -1 ? '无限制转换' : `${plan.conversions} 次转换/月`}
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="w-full mt-3 ghibli-button-gradient text-white py-2 px-4 rounded-md text-sm font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                    onClick={async () => {
                      try {
                        const planKey = key.toLowerCase() as 'basic' | 'pro' | 'enterprise';
                        const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
                        const res = await fetch('/api/billing/checkout', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({ plan: planKey }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          // 处理特定的错误情况
                          if (data.code === 'STRIPE_NOT_CONFIGURED') {
                            alert('订阅功能正在配置中，请稍后再试。如需帮助，请联系客服。');
                            return;
                          } else if (data.code === 'PLAN_NOT_CONFIGURED') {
                            alert('该订阅计划暂不可用，请选择其他计划或联系客服。');
                            return;
                          } else if (data.code === 'CUSTOMER_ERROR') {
                            alert('账户信息异常，请重新登录后重试。');
                            return;
                          }
                          throw new Error(data.error || 'Failed to start checkout');
                        }
                        if (data.url) window.location.href = data.url;
                      } catch (e) {
                        alert(e instanceof Error ? e.message : '订阅流程启动失败');
                      }
                    }}
                  >
                    选择此套餐
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                所有套餐均支持随时取消，无隐藏费用
              </p>
              {user && (
                <button
                  onClick={async () => {
                    try {
                      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
                      const res = await fetch('/api/billing/portal', {
                        method: 'POST',
                        headers: {
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed to open portal');
                      if (data.url) window.location.href = data.url;
                    } catch (e) {
                      alert(e instanceof Error ? e.message : '打开订阅管理失败');
                    }
                  }}
                  className="mt-3 text-indigo-600 hover:text-indigo-700 underline text-sm"
                >
                  管理现有订阅
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
}