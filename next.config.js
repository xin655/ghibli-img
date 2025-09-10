/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'ghibli-imgs-1.s3.us-east-1.amazonaws.com',
    ],
  },
  eslint: {
    // 在构建时忽略ESLint错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在构建时忽略TypeScript错误
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig 