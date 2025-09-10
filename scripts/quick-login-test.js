#!/usr/bin/env node

/**
 * 快速登录测试脚本
 * 验证token生成和用户数据
 */

const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

console.log('🔧 快速登录测试...\n');

// 生成测试token
function generateTestToken(userId, email, isAdmin = false) {
  const payload = {
    userId,
    email,
    googleId: isAdmin ? `admin_${Date.now()}` : `test_${Date.now()}`,
    ...(isAdmin && { isAdmin: true })
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d',
    issuer: 'ghibli-dreamer',
    audience: 'ghibli-dreamer-users'
  });
}

// 验证token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', {
      issuer: 'ghibli-dreamer',
      audience: 'ghibli-dreamer-users'
    });
    return { valid: true, payload: decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// 主函数
function main() {
  console.log('📋 1. 生成测试token...');
  
  const userToken = generateTestToken('68bfc35e2c9a8cc9d8d876f6', 'test@example.com');
  const adminToken = generateTestToken('68c0153130dca11dc3d2b810', 'admin@example.com', true);
  
  console.log('✅ 普通用户token生成成功');
  console.log(`   Token: ${userToken.substring(0, 50)}...`);
  
  console.log('✅ 管理员token生成成功');
  console.log(`   Token: ${adminToken.substring(0, 50)}...`);
  
  console.log('\n📋 2. 验证token...');
  
  const userVerification = verifyToken(userToken);
  const adminVerification = verifyToken(adminToken);
  
  if (userVerification.valid) {
    console.log('✅ 普通用户token验证成功');
    console.log(`   用户ID: ${userVerification.payload.userId}`);
    console.log(`   邮箱: ${userVerification.payload.email}`);
    console.log(`   管理员: ${userVerification.payload.isAdmin || false}`);
  } else {
    console.log('❌ 普通用户token验证失败:', userVerification.error);
  }
  
  if (adminVerification.valid) {
    console.log('✅ 管理员token验证成功');
    console.log(`   用户ID: ${adminVerification.payload.userId}`);
    console.log(`   邮箱: ${adminVerification.payload.email}`);
    console.log(`   管理员: ${adminVerification.payload.isAdmin || false}`);
  } else {
    console.log('❌ 管理员token验证失败:', adminVerification.error);
  }
  
  console.log('\n📋 3. 浏览器控制台测试脚本...');
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
  
  console.log('\n🎉 测试完成！');
  console.log('\n💡 使用方法:');
  console.log('1. 启动服务器: npm run dev');
  console.log('2. 在浏览器控制台运行上面的脚本');
  console.log('3. 测试登录和订阅功能');
}

main();
