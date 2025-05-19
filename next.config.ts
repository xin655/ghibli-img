import { NextConfig } from 'next';

const config: NextConfig = {
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, // 替换为你的实际客户端ID
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID, // 替换为你的实际客户端ID
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
  },
  // Enable experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default config;
