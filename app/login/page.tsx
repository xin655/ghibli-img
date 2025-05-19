"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Removed the old declare global block for Google types, 
// relying on @types/google.accounts or implicit types from the GSI script

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null); // Ref for the Google button div

  useEffect(() => {
    // Debug: Check if environment variables are loaded
    console.log('Environment variables:', {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL // baseUrl might not be needed here anymore, but keep for now
    });

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google OAuth script loaded'); // Debug log
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: async (response: { credential?: string }) => { // Callback receives the credential (ID Token)
            console.log('Google GSI callback response:', response); // Log the response
            if (!response.credential) {
              setError('Google 未返回 ID token');
              console.error('Google response did not contain credential:', response);
              return;
            }
            // Send the ID token to our backend
            try {
              const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  id_token: response.credential // Send the ID token
                })
              });
              
              if (!res.ok) {
                const errorData = await res.json();
                // Check if the error is the specific "No ID token provided" from backend for better feedback
                 if (errorData.error === "No ID token provided") {
                     setError('后端验证失败：未收到 ID token。'); // 更明确的错误信息
                 } else {
                    throw new Error(errorData.error || 'Authentication failed');
                 }
              } else {              
                  const data = await res.json();
                  if (data.token) {
                      // Store user state
                      localStorage.setItem('jwt', data.token);
                      localStorage.setItem('user', JSON.stringify(data.user));
                      localStorage.setItem('userState', JSON.stringify(data.userState));
                      
                      // Redirect to home page
                      router.push('/');
                  } else {
                      setError(data.error || '登录失败');
                  }
              }
            } catch (e) {
              console.error('Auth error:', e);
              setError(e instanceof Error ? e.message : '登录失败');
            }
          }
        });

        // Render the Google Sign-In button
        window.google.accounts.id.renderButton(
          googleBtnRef.current,
          {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: 300, // Adjust width as needed
            type: 'standard'
          }
        );

        // Optional: Render One Tap prompt
        // window.google.accounts.id.prompt(); 

      }
    };
    script.onerror = () => {
      setError('Failed to load Google OAuth script');
    };
    document.head.appendChild(script);

    return () => {
      // Clean up the script if component unmounts
      document.head.removeChild(script);
    };
  }, [router]); // Added router to dependencies

  return (
    <div className="min-h-screen bg-[#FFFFE5] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <span className="w-16 h-16 bg-[#FFFFE5] rounded-full flex items-center justify-center">
              <Image
                src="/logo.png"
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

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* This div will be replaced by the Google Sign-In button */}
        <div ref={googleBtnRef} className="flex justify-center"></div>

        {/* Removed the old manual button */}
        {/* <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Image
            src="/google.svg"
            alt="Google"
            width={20}
            height={20}
            className="object-contain"
          />
          <span>使用 Google 账号登录</span>
        </button> */}

      </div>
    </div>
  );
} 