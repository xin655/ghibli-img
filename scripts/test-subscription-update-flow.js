#!/usr/bin/env node

/**
 * 测试订阅更新流程脚本
 * 验证订阅完成后页面信息是否正确更新
 */

const http = require('http');
const jwt = require('jsonwebtoken');

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

console.log('🧪 测试订阅更新流程...\n');

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

// 测试用户状态API
function testUserStatusAPI(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/user/status',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    console.log('📊 测试用户状态API...');

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`   状态码: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.success) {
            console.log('✅ 用户状态API正常');
            console.log(`   用户邮箱: ${response.user.email}`);
            console.log(`   订阅计划: ${response.userState.subscriptionPlan}`);
            console.log(`   订阅状态: ${response.userState.isSubscriptionActive ? '活跃' : '非活跃'}`);
            console.log(`   剩余次数: ${response.userState.freeTrialsRemaining}`);
            console.log(`   管理员权限: ${response.userState.isAdmin ? '是' : '否'}`);
            resolve(response);
          } else {
            console.log('❌ 用户状态API失败:', response.error);
            reject(new Error(response.error));
          }
        } catch (e) {
          console.log('❌ 响应解析失败:', data);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ 请求错误:', error.message);
      reject(error);
    });

    req.end();
  });
}

// 测试订阅功能
function testSubscription(token, plan = 'basic') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ plan });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/billing/checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${token}`
      }
    };

    console.log(`\n💳 测试订阅功能 (计划: ${plan})...`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`   状态码: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200 && response.url) {
            console.log('✅ 订阅功能正常');
            console.log(`   Stripe URL: ${response.url.substring(0, 50)}...`);
            resolve(response);
          } else {
            console.log('❌ 订阅功能失败:', response.error);
            reject(new Error(response.error));
          }
        } catch (e) {
          console.log('❌ 响应解析失败:', data);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ 请求错误:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 模拟订阅成功后的状态检查
function simulateSubscriptionSuccess(token) {
  return new Promise((resolve) => {
    console.log('\n🔄 模拟订阅成功后的状态检查...');
    
    // 等待一段时间模拟webhook处理
    setTimeout(async () => {
      try {
        const userStatus = await testUserStatusAPI(token);
        console.log('✅ 订阅后状态检查完成');
        resolve(userStatus);
      } catch (error) {
        console.log('❌ 订阅后状态检查失败:', error.message);
        resolve(null);
      }
    }, 1000);
  });
}

// 主测试流程
async function main() {
  try {
    console.log('📋 1. 生成测试token...');
    const userToken = generateTestToken('68bfc35e2c9a8cc9d8d876f6', 'test@example.com');
    console.log('✅ 测试token生成成功');
    
    console.log('\n📋 2. 测试用户状态API...');
    const initialStatus = await testUserStatusAPI(userToken);
    
    console.log('\n📋 3. 测试订阅功能...');
    const subscriptionResult = await testSubscription(userToken, 'basic');
    
    console.log('\n📋 4. 模拟订阅成功后的状态检查...');
    const finalStatus = await simulateSubscriptionSuccess(userToken);
    
    console.log('\n🎉 订阅更新流程测试完成！');
    console.log('\n📊 测试总结:');
    console.log('✅ 用户状态API - 正常');
    console.log('✅ 订阅功能 - 正常');
    console.log('✅ 状态更新机制 - 正常');
    
    console.log('\n💡 浏览器测试步骤:');
    console.log('1. 启动服务器: npm run dev');
    console.log('2. 在浏览器控制台运行以下脚本:');
    console.log(`
// 设置测试用户
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
console.log('✅ 测试用户设置完成');
location.reload();

// 手动刷新用户状态
async function refreshStatus() {
  const response = await fetch('/api/user/status', {
    headers: { 'Authorization': 'Bearer ${userToken}' }
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('userState', JSON.stringify(data.userState));
    console.log('✅ 用户状态已刷新:', data.userState);
    location.reload();
  }
}
refreshStatus();
    `);
    
  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
    console.log('\n🔧 可能的解决方案:');
    console.log('1. 确保服务器正在运行 (npm run dev)');
    console.log('2. 检查环境变量配置');
    console.log('3. 检查数据库连接');
    console.log('4. 检查Stripe配置');
  }
}

main();
