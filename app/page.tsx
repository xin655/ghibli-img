"use client";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { CONFIG } from './config/constants';
import Link from "next/link";
import { useSession, signIn, signOut } from 'next-auth/react';
import ReactCompareImage from 'react-compare-image';

// Removed MOCK_USER as we will use actual logged-in user data
// const MOCK_USER = {
//   name: "Ghibli User",
//   email: "ghibli@example.com",
//   photo: "https://randomuser.me/api/portraits/lego/1.jpg",
// };

const STYLES = [
  { label: "Ghibli Style", value: "ghibli" },
  { label: "Watercolor", value: "watercolor" },
  { label: "Comic", value: "comic" },
  { label: "Anime", value: "anime" },
];

const FREE_LIMIT = 3; // This might be better managed via userState from backend

// Define a type for the user object stored in state (should match what backend returns)
interface LoggedInUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  // Add other relevant fields from your backend user object
}

export default function Home() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
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
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [freeCount, setFreeCount] = useState(0);
  const [unauthenticatedFreeCount, setUnauthenticatedFreeCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // 获取 profile 信息
  useEffect(() => {
    if (session && status === 'authenticated') {
      setProfileLoading(true);
      setProfileError(null);
      fetch('/api/user/profile', { credentials: 'include' })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to fetch profile');
          }
          return res.json();
        })
        .then((data) => setProfile(data))
        .catch((err) => setProfileError(err.message))
        .finally(() => setProfileLoading(false));
    } else {
      setProfile(null);
    }
  }, [session, status]);

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

  // Handle transform
  async function handleTransform() {
    if (!selectedFile) {
      setTransformError('Please select an image first');
      return;
    }

    // 检查免费次数 (优先检查登录用户的次数，然后检查未登录用户的次数)
    if (session) {
      // 已登录用户，检查后端返回的 freeCount
      if (!profile) {
        // Profile not loaded yet, maybe show a loading indicator or wait
        console.log('Profile not loaded, cannot transform yet.');
        // Optionally set a specific error or disable the button while profile loads
        setTransformError('Loading user profile, please wait...');
        return;
      }
      // 已登录用户，免费次数检查依赖于后端 profile 数据
      if (profile.freeTrialsRemaining <= 0) {
        setShowLimitDialog(true);
        return;
      }
      // Ensure session user data is available (should be if session is authenticated, but added for safety)
      if (!session.user || !session.user.email) {
        setTransformError('User session data incomplete. Please try signing in again.');
        return;
      }
    } else {
      // 未登录用户，检查 localStorage 中的 unauthenticatedFreeCount
      // 读取 localStorage 中的当前未登录免费次数
      const currentUnauthenticatedFreeCount = parseInt(localStorage.getItem('unauthenticatedFreeCount') || CONFIG.FREE_TRIAL.UNAUTHENTICATED_USER_LIMIT.toString(), 10);

      if (currentUnauthenticatedFreeCount <= 0) {
        setShowLimitDialog(true);
        return;
      }
    }

    try {
      setIsTransforming(true);
      setTransformError(null);

      // 首先上传图片
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      setUploadedUrl(uploadData.url);

      // 然后进行转换
      const transformResponse = await fetch('/api/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: uploadData.url,
          style: selectedStyle,
        }),
        credentials: 'include',
      });

      if (!transformResponse.ok) {
        const error = await transformResponse.json();
        throw new Error(error.error || 'Failed to transform image');
      }

      const data = await transformResponse.json();
      setResultUrl(data.transformedImageUrl);
      
      // Update free trial count for unauthenticated users AFTER successful transformation
      if (!session) {
        const currentUnauthenticatedFreeCount = parseInt(localStorage.getItem('unauthenticatedFreeCount') || CONFIG.FREE_TRIAL.UNAUTHENTICATED_USER_LIMIT.toString(), 10);
        localStorage.setItem('unauthenticatedFreeCount', (currentUnauthenticatedFreeCount - 1).toString());
        setUnauthenticatedFreeCount(currentUnauthenticatedFreeCount - 1); // Update state to reflect immediately
        console.log('Unauthenticated free trial count decremented.', currentUnauthenticatedFreeCount - 1);
      }
      // For authenticated users, the free trial count is decremented in the backend (/api/transform)

    } catch (error) {
      console.error('Transform error:', error);
      setTransformError(error instanceof Error ? error.message : 'Failed to transform image');
    } finally {
      setIsTransforming(false);
    }
  }

  // Handle file selection
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setUploadError(null);
    setResultUrl(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size should be less than 5MB');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPreviewUrl(previewUrl);
    // 保存文件对象以供后续使用
    setSelectedFile(file);
  }

  // Handle upload click
  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  // Handle download
  async function handleDownload() {
    if (!resultUrl) {
      setDownloadError('No image to download');
      return;
    }

    if (!session) {
      setDownloadError('Please login to download images');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadError(null);

      const response = await fetch(`/api/download?url=${encodeURIComponent(resultUrl)}&style=${selectedStyle}`, {
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download image');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ghibli-${selectedStyle}-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadError(error instanceof Error ? error.message : 'Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  }

  // Function to handle user logout
  function handleLogout() {
    // Clear all user-related state
    setFreeCount(0);
    setPreviewUrl(null);
    setResultUrl(null);
    setUploadedUrl(null);
    setSelectedStyle('ghibli');
    
    // Clear all user-related data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('jwt');
    localStorage.removeItem('userState');
    
    // Redirect to home page
    window.location.href = '/';
  }

  // 处理订阅按钮点击
  function handleSubscribe() {
    window.location.href = '/subscription';
  }

  // 处理关闭限制弹窗
  function handleCloseLimitDialog() {
    setShowLimitDialog(false);
  }

  // 头部用户信息
  function Header() {
    if (status === 'loading') return <div>Loading...</div>;
    if (!session) {
      return <button 
        onClick={() => signIn('google')}
        className="px-4 py-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white font-medium rounded-full transition-all duration-150 shadow-sm hover:shadow-md active:shadow-sm"
      >
        Sign in
      </button>;
    }
    return (
      <div className="relative" ref={avatarRef}>
        <button
          className="flex items-center focus:outline-none cursor-pointer"
          onClick={() => setAvatarMenuOpen((open) => !open)}
          type="button"
        >
          <Image
            src={session.user?.image || '/default-avatar.png'}
            alt="User Avatar"
            width={32}
            height={32}
            className="rounded-full border border-gray-300 shadow-sm cursor-pointer"
          />
        </button>
        {avatarMenuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-2 z-[100] border border-gray-200">
            <Link
              href="/profile"
              className="block px-4 py-2 text-gray-700 text-sm transition-all duration-150 hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
              onClick={() => setAvatarMenuOpen(false)}
            >
              个人主页
            </Link>
            <button
              onClick={() => { setAvatarMenuOpen(false); signOut(); }}
              className="block w-full text-left px-4 py-2 text-gray-700 text-sm transition-all duration-150 hover:bg-gray-100 active:bg-gray-200 rounded cursor-pointer"
              type="button"
            >
              退出
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFE5] text-[#2d4c2f] font-sans">
      {/* 主视觉区 */}
      <section className="relative min-h-screen flex flex-col justify-between overflow-hidden">
        {/* 背景图 */}
        <div className="absolute inset-0 w-screen">
          <Image
            src="/images/backgrounds/image1.png"
            alt="Background"
            fill
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
            priority
            className="w-full h-full"
          />
        </div>
        {/* 内容容器 */}
        <div className="relative z-10 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        {/* 顶部导航栏 */}
          <header className="flex justify-between items-center pt-6 pb-2 w-full">
          <div className="flex items-center gap-2">
              <Image
                src="/images/icons/image 7.png"
                alt="Ghibli Dreamer Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
            <span className="font-bold text-lg md:text-2xl tracking-wide text-white drop-shadow" style={{fontFamily:'Inter',textShadow:'0px 2px 4px rgba(0,0,0,0.25)'}}>Ghibli Dreamer</span>
          </div>
          <div className="flex items-center gap-6 md:gap-8">
            <a href="/subscription" className="text-white font-bold text-base md:text-lg drop-shadow" style={{fontFamily:'Inter'}}>Subscription</a>
              <Header />
          </div>
          {/* 订阅卡片（PC端显示，移动端下移） */}
            <div className="hidden md:flex absolute right-8 top-24 flex-col items-start">
                {/* 订阅卡片内容 */}
                <div className="relative bg-white/20 rounded-2xl px-6 py-4 flex-col items-start shadow-lg backdrop-blur-md border border-white/30 min-w-[400px] z-10">
                    <Link href="/subscription" className="flex items-center justify-between w-full group">
                        <span className="text-white font-semibold" style={{fontFamily:'Inter'}}>Subscribe</span>
                        {/* 移除箭头图标 */}
                        {/* <span className="ml-2 text-[#5EE692] text-xl">↗</span> */}
                    </Link>
                    <div className="text-white/80 mt-2 text-sm" style={{fontFamily:'Inter'}}>for more transformations<br/>and advanced features ✨</div>
                    {/* 将叠加的图片移动到卡片内容div内部，并调整定位 */}
                    <div className="absolute" style={{ right: '-30px', top: '15px', width: '60px', height: '60px' }}>
                        <Image src="/images/icons/Rectangle 7.png" alt="Rectangle" width={60} height={60} className="absolute" style={{ top: 0, left: 0, zIndex: 15 }} />
                        <Image src="/images/icons/Arrow 1.png" alt="Arrow" width={25} height={25} className="absolute" style={{ top: '18px', left: '18px', zIndex: 20 }} />
                    </div>
                </div>
                {/* 移除旧的叠加图片容器 */}
                {/* <div className="absolute" style={{ right: '-35px', top: '15px', width: '60px', height: '60px' }}>
                    <Image src="/images/icons/Rectangle 7.png" alt="Rectangle" width={60} height={60} className="absolute" style={{ top: 0, left: 0, zIndex: 15 }} />
                    <Image src="/images/icons/Arrow 1.png" alt="Arrow" width={25} height={25} className="absolute" style={{ top: '18px', left: '18px', zIndex: 20 }} />
                </div> */}
            </div>
        {/* 订阅卡片（移动端） */}
        <div className="flex md:hidden z-10 w-full justify-end mt-2">
          <div className="bg-white/20 rounded-2xl px-4 py-3 flex flex-col items-start shadow-lg backdrop-blur-md border border-white/30 min-w-[220px] max-w-xs">
            <div className="flex items-center justify-between w-full">
              <span className="text-white font-semibold">Subscribe</span>
              <span className="ml-2 text-[#5EE692] text-xl">↗</span>
            </div>
            <div className="text-white/80 mt-2 text-xs">for more transformations and advanced features ✨</div>
          </div>
        </div>
          </header>
        {/* 主内容区 */}
          <main className="relative z-[1] flex flex-col items-start justify-center flex-1 w-full pt-8 md:pt-24">
          <h1 className="font-extrabold text-white mb-4 drop-shadow" style={{fontFamily:'Inter',fontSize:'2.2rem',lineHeight:'2.7rem',textShadow:'0px 2px 4px rgba(0,0,0,0.25)'}}>
            <span className="text-4xl md:text-5xl lg:text-6xl">STEP INTO A<br className="hidden md:block"/>GHIBLI DREAM</span>
          </h1>
          <p className="text-white mb-8 max-w-xl drop-shadow" style={{fontFamily:'Inter',fontSize:'1.1rem',lineHeight:'1.7rem',textShadow:'0px 2px 4px rgba(0,0,0,0.25)'}}>Upload your photo and watch it come alive—like it's straight out of a Studio Ghibli film.</p>
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full max-w-4xl mb-8">
            {/* 上传区 */}
            <div
              className="flex-1 bg-gradient-to-br from-[#228E73]/50 to-[#C5FFF1]/50 rounded-[2.5rem] md:rounded-[80px] min-h-[180px] md:min-h-[260px] flex flex-col items-center justify-center border border-[#00FF65] shadow-lg cursor-pointer transition hover:bg-white/20 relative backdrop-blur-md mx-auto"
              onClick={handleUploadClick}
            >
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00FF65]"></div>
                  <span className="mt-2 text-[#00FF65] font-bold text-base">Uploading...</span>
                </div>
              ) : previewUrl ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img 
                    src={previewUrl} 
                    alt="preview" 
                    className="max-h-32 md:max-h-40 max-w-full rounded-xl object-contain" 
                  />
                  {uploadError && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 text-white text-sm p-1 text-center">
                      {uploadError}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className="text-5xl md:text-6xl text-[#00FF65]">+</span>
                  <span className="mt-2 text-[#00FF65] font-bold text-base md:text-lg" style={{fontFamily:'Inter'}}>
                    {uploadError ? 'Click to try again' : 'Drag or upload your image here'}
                  </span>
                </>
              )}
            </div>
            {/* 结果区 */}
            <div className="flex-1 bg-gradient-to-br from-[#DBBF7D]/50 to-[#FFFAEE]/50 rounded-[2.5rem] md:rounded-[80px] min-h-[180px] md:min-h-[260px] flex flex-col items-center justify-center border border-white/30 shadow-lg backdrop-blur-md mx-auto">
              {resultUrl ? (
                <img src={resultUrl} alt="result" className="max-h-32 md:max-h-40 max-w-full rounded-xl object-contain mb-4" />
              ) : (
                <span className="text-white/80 text-base md:text-lg font-bold" style={{fontFamily:'Inter'}}>Click "Transform" for results</span>
              )}
            </div>
          </div>
          {/* 底部操作区 */}
          <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-2xl mb-4">
            <span className="text-[#D0F1DB] font-bold text-base md:text-lg" style={{fontFamily:'Inter'}}>Style:</span>
            <select 
              className="rounded-full px-4 py-2 border border-[#228E73] bg-[#D0F1DB] text-[#006C2B] font-bold focus:outline-none" 
              value={selectedStyle} 
              onChange={(e) => setSelectedStyle(e.target.value)} 
              style={{fontFamily:'Inter'}}
              disabled={isTransforming}
            >
              {STYLES.map((style) => (
                <option key={style.value} value={style.value}>{style.label}</option>
              ))}
            </select>
            <button
              onClick={handleTransform}
              disabled={isTransforming || !selectedFile}
              className="rounded-full px-6 py-2 bg-[#00FF65] text-[#006C2B] font-bold hover:bg-[#00E65C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{fontFamily:'Inter'}}
            >
              {isTransforming ? 'Transforming...' : 'Transform Now'}
            </button>
            {resultUrl && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="rounded-full px-6 py-2 bg-[#228E73] text-white font-bold hover:bg-[#1A7A62] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{fontFamily:'Inter'}}
              >
                {isDownloading ? 'Downloading...' : 'Download'}
              </button>
            )}
          </div>
          {transformError && (
            <div className="text-red-500 text-sm mb-4">{transformError}</div>
          )}
          {downloadError && (
            <div className="text-red-500 text-sm mb-4">{downloadError}</div>
          )}
        </main>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-16 px-4 flex flex-col items-center w-full max-w-7xl mx-auto bg-[#FFFFE5]">
        {/* 标题 */}
        <h2 className="text-center font-extrabold mb-12"
          style={{
            fontFamily: 'Inter',
            fontSize: '3rem',
            lineHeight: '3.5rem',
            fontWeight: 800,
            background: 'linear-gradient(90deg, #B2BBA3 0%, #63B784 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0px 2px 4px rgba(0,0,0,0.10)'
          }}
        >How It Works</h2>
        <div className="relative flex flex-col items-center w-full max-w-4xl min-h-[480px]" style={{height:'480px'}}>
          {/* S形SVG路径（更圆润更宽大） */}
          <svg className="absolute left-1/2 top-0 -translate-x-1/2 z-0" width="120" height="342" viewBox="0 0 180 514" fill="none" xmlns="http://www.w3.org/2000/svg" style={{height:'342px',maxHeight:'342px'}}>
            <defs>
              <linearGradient id="s-curve-gradient2" x1="98" y1="22" x2="98" y2="442" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F2F2C9"/>
                <stop offset="1" stopColor="#99BDA7"/>
              </linearGradient>
            </defs>
            <path d="M152.813 22C116.404 61.9757 74.8569 94.1431 46.976 142.248C36.7798 159.84 24.2975 196.376 38.1387 215.828C60.2881 246.957 90.4541 251.704 118.5 271.5C123.765 275.216 132.455 281.877 139 290.5C145.935 299.636 149.139 303.077 153 312.5C167.758 348.514 139 389.5 118.5 406C80.9732 436.204 31.3405 477 22.5 491.5" stroke="url(#s-curve-gradient2)" strokeWidth="44" strokeLinecap="round" opacity="0.89"/>
          </svg>
          {/* 步骤1 */}
          <div className="absolute left-0 top-0 w-[340px] text-left z-10" style={{top:'0',left:'0'}}>
            <div className="text-base md:text-lg leading-snug" style={{fontFamily:'Inter'}}>
              <span className="font-extrabold text-black text-xl md:text-2xl">STEP 1: Upload your photo</span><br/>
              <span className="text-black text-base md:text-lg">(portrait, pet, or anything you like)</span>
            </div>
          </div>
          {/* 步骤2 */}
          <div className="absolute right-0 top-[44%] md:top-[48%] -translate-y-1/2 w-[340px] text-right z-10">
            <div className="text-base md:text-lg leading-snug" style={{fontFamily:'Inter'}}>
              <span className="font-extrabold text-black text-xl md:text-2xl">STEP 2:</span> <span className="text-black text-base md:text-lg">Click <b>"Tranform"</b> and<br/>let our magic do the rest</span>
            </div>
          </div>
          {/* 步骤3 居中于S线下方 */}
          <div className="absolute left-1/2 z-10 flex items-center justify-center" style={{transform: 'translate(-50%, 0)', bottom: '-40px', width: '480px'}}>
            <img src="/images/img/Group 7.png" alt="step3" style={{width:'110px',height:'110px',borderRadius:'50%',objectFit:'cover',marginRight:'22px',border:'none',boxShadow:'0 2px 8px rgba(0,0,0,0.10)'}} />
            <div className="text-base md:text-lg leading-snug" style={{fontFamily:'Inter', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
              <span className="font-extrabold text-black text-xl md:text-2xl" style={{lineHeight:'2.2rem'}}>STEP 3: Download</span>
              <span className="text-black text-base md:text-lg" style={{lineHeight:'1.7rem'}}>and share your unique Ghibli-style artwork</span>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4 flex flex-col items-center w-full max-w-7xl mx-auto bg-[#FFFFE5]">
        <h2
          className="text-center font-extrabold mb-12"
          style={{
            fontFamily: 'Inter',
            fontSize: '2.5rem',
            lineHeight: '3.5rem',
            background: 'linear-gradient(90.94deg, #D1CFA2 -4.75%, #63B784 99.19%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0px 2px 4px rgba(0,0,0,0.15)'
          }}
        >
          Use Cases
        </h2>
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl justify-center items-stretch">
          {/* 左侧大插画改为交互式对比 */}
          <div className="flex-1 flex items-center justify-center mb-8 md:mb-0">
            <div style={{ width: 432, height: 480 }}>
              <ReactCompareImage
                leftImage="/images/img/779516f51440bf2da2f7ccf0b8bf0d8a09f8c513.png"
                rightImage="/images/img/a300a83ccb414bb92a2d6a10baec1301d1871e95.png"
                sliderLineWidth={2}
                sliderLineColor="#0070f3"
                handleSize={40}
                aspectRatio="wider"
              />
            </div>
          </div>
          {/* 右侧卡片组 */}
          <div className="flex-1 flex flex-col gap-6 justify-center">
            {/* 卡片1 */}
            <div className="rounded-[30px] shadow-lg border border-[#00FF65] px-6 py-6 flex items-center gap-4" style={{background: '#8CEAD278'}}>
              <img src="/images/icons/use1.png" alt="Profile" className="w-14 h-14 rounded-full bg-[#D9D9D9] object-cover" />
              <div>
                <div className="font-bold text-[#006C2B] text-lg mb-1" style={{fontFamily:'Inter'}}>Profile Pictures & Wallpapers</div>
                <div className="text-black text-base" style={{fontFamily:'Inter'}}>Stand out on social media or your devices with a magical, hand-crafted Ghibli-style portrait or landscape. Perfect for avatars, backgrounds, and more.</div>
              </div>
            </div>
            {/* 卡片2 */}
            <div className="rounded-[30px] shadow-lg border border-[#00FF65] px-6 py-6 flex items-center gap-4" style={{background: '#8CEAD278'}}>
              <img src="/images/icons/use2.png" alt="Gift" className="w-14 h-14 rounded-full bg-[#D9D9D9] object-cover" />
              <div>
                <div className="font-bold text-[#006C2B] text-lg mb-1" style={{fontFamily:'Inter'}}>Gifts for Friends & Family</div>
                <div className="text-black text-base" style={{fontFamily:'Inter'}}>Surprise your loved ones with a unique, personalized Ghibli-style artwork. Great for birthdays, holidays, or just because!</div>
              </div>
            </div>
            {/* 卡片3 */}
            <div className="rounded-[30px] shadow-lg border border-[#00FF65] px-6 py-6 flex items-center gap-4" style={{background: '#8CEAD278'}}>
              <img src="/images/icons/use3.png" alt="Art" className="w-14 h-14 rounded-full bg-[#D9D9D9] object-cover" />
              <div>
                <div className="font-bold text-[#006C2B] text-lg mb-1" style={{fontFamily:'Inter'}}>Art Projects & Inspiration</div>
                <div className="text-black text-base" style={{fontFamily:'Inter'}}>Use your Ghibli art for creative projects, mood boards, or as inspiration for your next masterpiece. Let your imagination run wild!</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Unlock the Magic */}
      <section className="py-16 px-4 flex flex-col items-center w-full max-w-7xl mx-auto bg-[#FFFFE5]">
        <div className="relative w-[1267px] h-[845px] rounded-[40px] overflow-hidden flex flex-col items-center justify-center" style={{background:'#F9F8E7',boxShadow:'0 4px 32px 0 rgba(0,0,0,0.06)'}}>
          {/* 背景拼贴图 */}
          <img src="/images/backgrounds/image16.png" alt="Unlock collage" className="absolute inset-0 w-full h-full object-cover z-0" style={{opacity:0.95}} />
          {/* 标题 */}
          <h2 className="relative z-10 text-center font-extrabold mb-8 mt-8" style={{fontFamily:'Inter', fontSize:'2.2rem', lineHeight:'2.7rem', color:'#5EE692', textShadow:'0px 2px 4px rgba(0,0,0,0.10)'}}>Unlock the Magic</h2>
          {/* 居中卡片 */}
          <div className="relative z-10 mx-auto w-full max-w-md bg-white/80 rounded-[32px] border border-[#5EE692] shadow-lg px-8 py-8 flex flex-col items-center" style={{backdropFilter:'blur(2px)'}}>
            <ul className="w-full mb-6 space-y-3">
              <li className="flex items-center gap-3 text-[#5EE692] text-base md:text-lg font-semibold" style={{fontFamily:'Inter'}}><span className="text-xl text-black">✔</span> Unlimited Ghibli-style generations</li>
              <li className="flex items-center gap-3 text-[#5EE692] text-base md:text-lg font-semibold" style={{fontFamily:'Inter'}}><span className="text-xl text-black">✔</span> High-resolution downloads</li>
              <li className="flex items-center gap-3 text-[#5EE692] text-base md:text-lg font-semibold" style={{fontFamily:'Inter'}}><span className="text-xl text-black">✔</span> Exclusive member styles</li>
              <li className="flex items-center gap-3 text-[#5EE692] text-base md:text-lg font-semibold" style={{fontFamily:'Inter'}}><span className="text-xl text-black">✔</span> Priority processing</li>
              <li className="flex items-center gap-3 text-[#5EE692] text-base md:text-lg font-semibold" style={{fontFamily:'Inter'}}><span className="text-xl text-black">✔</span> Dedicated member support</li>
              <li className="flex items-center gap-3 text-[#5EE692] text-base md:text-lg font-semibold" style={{fontFamily:'Inter'}}><span className="text-xl text-black">✔</span> Commercial use allowed</li>
              <li className="flex items-center gap-3 text-[#5EE692] text-base md:text-lg font-semibold" style={{fontFamily:'Inter'}}><span className="text-xl text-black">✔</span> Cancel anytime</li>
            </ul>
            <Link
              href="/subscription"
              className="w-full rounded-full py-3 bg-[#19B15E] text-white font-bold text-lg shadow hover:bg-[#00FF65] transition text-center block"
              style={{fontFamily:'Inter'}}
            >
              Subscribe now
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4 bg-[#FFFFE5] flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-8 text-[#7fc97f]">Frequently Ask Question</h2>
        <div className="max-w-2xl w-full space-y-6">
          <div>
            <b>Is my photo safe?</b>
            <div className="text-sm mt-1">Yes! Your photo is only used for generating art, and is never shared or stored longer than needed.</div>
          </div>
          <div>
            <b>How long does it take to generate?</b>
            <div className="text-sm mt-1">Usually just a few seconds. If the server is busy, it may take a bit longer.</div>
          </div>
          <div>
            <b>What kind of photos work best?</b>
            <div className="text-sm mt-1">Clear portraits, pets, or scenery with good lighting give the best results.</div>
          </div>
          <div>
            <b>Can I use the generated images commercially?</b>
            <div className="text-sm mt-1">Yes! Subscribers can use their generated images for commercial purposes.</div>
          </div>
          <div>
            <b>How do I cancel my subscription?</b>
            <div className="text-sm mt-1">You can cancel anytime in your account dashboard. Your access remains until the end of the billing period.</div>
          </div>
        </div>
      </section>

      {/* 联系方式与页脚 */}
      <footer className="py-8 px-4 bg-[#FFFFE5] flex flex-col items-center text-center text-[#3b6b4b]">
        <div className="mb-2">Contact & Support</div>
        <div className="mb-2">Have questions or need help? Email us at <a href="mailto:notesinnocamp@gmail.com" className="underline">notesinnocamp@gmail.com</a></div>
        <div className="text-xs text-[#a0b88b] mt-2">© 2025 Ghibli Dreamer. All rights reserved.</div>
      </footer>

      {/* 免费次数用尽弹窗 */}
      {showLimitDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
            <div className="mb-4 text-lg font-bold text-[#7fc97f]">免费次数已用尽</div>
            <div className="mb-4 text-[#3b6b4b]">请订阅以继续体验更多 Ghibli 风格转换！</div>
            <button
              onClick={handleCloseLimitDialog}
              className="rounded-full px-6 py-2 bg-[#7fc97f] text-white font-semibold shadow hover:bg-[#5fa75f] transition mb-2"
            >
              关闭
            </button>
            <button
              onClick={handleSubscribe}
              className="rounded-full px-6 py-2 bg-[#4285F4] text-white font-semibold shadow hover:bg-[#3367d6]"
            >
              立即订阅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
