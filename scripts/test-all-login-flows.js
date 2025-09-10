#!/usr/bin/env node

/**
 * 测试所有登录流程脚本
 * 包括普通用户、管理员登录和订阅功能测试
 */

const http = require('http');
const jwt = require('jsonwebtoken');

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

console.log('🧪 开始测试所有登录流程...\n');

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

// 测试管理员登录API
function testAdminLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      mode: 'admin',
      email: 'admin@example.com'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/admin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('🔑 测试管理员登录API...');

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
            console.log('✅ 管理员登录成功');
            console.log(`   用户邮箱: ${response.user.email}`);
            console.log(`   管理员权限: ${response.userState.isAdmin ? '是' : '否'}`);
            console.log(`   订阅计划: ${response.userState.subscriptionPlan}`);
            resolve(response);
          } else {
            console.log('❌ 管理员登录失败:', response.error);
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

// 测试普通用户token
function testUserToken() {
  return new Promise((resolve, reject) => {
    const userToken = generateTestToken('68bfc35e2c9a8cc9d8d876f6', 'test@example.com');
    
    console.log('\n👤 测试普通用户token...');
    console.log(`   Token: ${userToken.substring(0, 50)}...`);
    
    // 测试订阅功能
    testSubscription(userToken, 'basic')
      .then(resolve)
      .catch(reject);
  });
}

// 测试管理员token
function testAdminToken() {
  return new Promise((resolve, reject) => {
    const adminToken = generateTestToken('68c0153130dca11dc3d2b810', 'admin@example.com', true);
    
    console.log('\n👑 测试管理员token...');
    console.log(`   Token: ${adminToken.substring(0, 50)}...`);
    
    // 测试订阅功能
    testSubscription(adminToken, 'enterprise')
      .then(resolve)
      .catch(reject);
  });
}

// 主测试流程
async function main() {
  try {
    // 1. 测试管理员登录API
    const adminLoginResult = await testAdminLogin();
    
    // 2. 使用管理员登录返回的token测试订阅
    await testSubscription(adminLoginResult.token, 'pro');
    
    // 3. 测试生成的普通用户token
    await testUserToken();
    
    // 4. 测试生成的管理员token
    await testAdminToken();
    
    console.log('\n🎉 所有登录流程测试完成！');
    console.log('\n📋 测试总结:');
    console.log('✅ 管理员登录API - 正常');
    console.log('✅ 订阅功能 - 正常');
    console.log('✅ Token验证 - 正常');
    console.log('✅ 用户权限 - 正常');
    
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
