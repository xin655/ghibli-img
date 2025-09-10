#!/usr/bin/env node

/**
 * 生成有效的测试token脚本
 * 用于生成未过期的测试用户和管理员token
 */

const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

// 生成JWT token
function generateToken(payload, expiresIn = '7d') {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, jwtSecret, { 
    expiresIn,
    issuer: 'ghibli-dreamer',
    audience: 'ghibli-dreamer-users'
  });
}

// 生成普通用户token
function generateUserToken() {
  const payload = {
    userId: '68bfc35e2c9a8cc9d8d876f6', // 固定用户ID
    email: 'test@example.com',
    googleId: 'test-google-id-123'
  };
  
  return generateToken(payload, '7d');
}

// 生成管理员token
function generateAdminToken() {
  const payload = {
    userId: '68c0153130dca11dc3d2b810', // 固定管理员ID
    email: 'admin@example.com',
    googleId: 'admin_1757418801327',
    isAdmin: true
  };
  
  return generateToken(payload, '7d');
}

// 主函数
function main() {
  console.log('🔧 生成有效的测试token...\n');
  
  const userToken = generateUserToken();
  const adminToken = generateAdminToken();
  
  console.log('📋 普通用户测试token:');
  console.log(`Token: ${userToken}`);
  console.log(`用户ID: 68bfc35e2c9a8cc9d8d876f6`);
  console.log(`邮箱: test@example.com`);
  console.log(`过期时间: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleString()}\n`);
  
  console.log('📋 管理员测试token:');
  console.log(`Token: ${adminToken}`);
  console.log(`用户ID: 68c0153130dca11dc3d2b810`);
  console.log(`邮箱: admin@example.com`);
  console.log(`管理员权限: 是`);
  console.log(`过期时间: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleString()}\n`);
  
  console.log('💡 浏览器控制台使用脚本:');
  console.log(`
// 普通用户测试登录
localStorage.clear();
localStorage.setItem('jwt', '${userToken}');
localStorage.setItem('user', JSON.stringify({
  id: '68bfc35e2c9a8cc9d8d876f6',
  email: 'test@example.com',
  name: '测试用户',
  photo: '/images/icons/use1.png'
}));
localStorage.setItem('userState', JSON.stringify({
  freeTrialsRemaining: 5,
  totalTransformations: 0,
  subscriptionPlan: 'free',
  isSubscriptionActive: false,
  isAdmin: false
}));
console.log('✅ 普通用户测试登录完成');
location.reload();

// 管理员测试登录
localStorage.clear();
localStorage.setItem('jwt', '${adminToken}');
localStorage.setItem('user', JSON.stringify({
  id: '68c0153130dca11dc3d2b810',
  email: 'admin@example.com',
  name: 'Admin User',
  photo: ''
}));
localStorage.setItem('userState', JSON.stringify({
  freeTrialsRemaining: -1,
  totalTransformations: 0,
  subscriptionPlan: 'enterprise',
  isSubscriptionActive: true,
  isAdmin: true
}));
console.log('✅ 管理员测试登录完成');
location.reload();
  `);
  
  console.log('\n🎉 Token生成完成！');
}

main();
