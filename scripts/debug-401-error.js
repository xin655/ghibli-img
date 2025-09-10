#!/usr/bin/env node

/**
 * 401 错误调试脚本
 * 用于诊断 JWT token 验证问题
 */

const http = require('http');
const jwt = require('jsonwebtoken');

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

console.log('🔍 开始诊断 401 错误...\n');

// 1. 检查环境变量
console.log('📋 1. 检查环境变量:');
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.log('❌ JWT_SECRET 未设置');
  process.exit(1);
} else {
  console.log('✅ JWT_SECRET 已设置');
  console.log(`   值: ${jwtSecret.substring(0, 10)}...`);
}

// 2. 测试 JWT token 生成和验证
console.log('\n📋 2. 测试 JWT token 生成和验证:');
try {
  const testPayload = { userId: 'test-user-id', email: 'test@example.com' };
  const testToken = jwt.sign(testPayload, jwtSecret, { expiresIn: '7d' });
  console.log('✅ JWT token 生成成功');
  console.log(`   Token: ${testToken.substring(0, 50)}...`);
  
  const decoded = jwt.verify(testToken, jwtSecret);
  console.log('✅ JWT token 验证成功');
  console.log(`   解码结果: ${JSON.stringify(decoded)}`);
} catch (error) {
  console.log('❌ JWT token 验证失败:', error.message);
}

// 3. 测试登录获取真实 token
console.log('\n📋 3. 测试登录获取真实 token:');
function testLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      id_token: 'test-google-id-token' // 这里使用测试值
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`   登录响应状态: ${res.statusCode}`);
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          console.log('✅ 登录成功');
          console.log(`   Token: ${response.token ? response.token.substring(0, 50) + '...' : '无'}`);
          resolve(response.token);
        } else {
          console.log('❌ 登录失败:', data);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ 登录请求错误:', error.message);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

// 4. 测试 checkout API
function testCheckout(token, plan = 'basic') {
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
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    console.log(`\n📋 4. 测试 checkout API (plan: ${plan}):`);
    console.log(`   Authorization header: ${token ? 'Bearer ' + token.substring(0, 20) + '...' : '无'}`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`   响应状态: ${res.statusCode}`);
        console.log(`   响应头: ${JSON.stringify(res.headers, null, 2)}`);
        
        try {
          const response = JSON.parse(data);
          console.log(`   响应内容: ${JSON.stringify(response, null, 2)}`);
        } catch {
          console.log(`   响应内容: ${data}`);
        }

        if (res.statusCode === 401) {
          console.log('❌ 401 错误 - 身份验证失败');
          console.log('   可能原因:');
          console.log('   1. Token 无效或过期');
          console.log('   2. JWT_SECRET 不匹配');
          console.log('   3. Token 格式错误');
          console.log('   4. Authorization header 格式错误');
        } else if (res.statusCode === 200) {
          console.log('✅ 请求成功');
        } else {
          console.log(`⚠️  其他错误: ${res.statusCode}`);
        }
        
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log('❌ 请求错误:', error.message);
      resolve({ status: 0, error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

// 5. 测试无效 token
function testInvalidToken() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ plan: 'basic' });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/billing/checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer invalid-token-123'
      }
    };

    console.log('\n📋 5. 测试无效 token:');

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`   响应状态: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          console.log(`   响应内容: ${JSON.stringify(response, null, 2)}`);
        } catch {
          console.log(`   响应内容: ${data}`);
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log('❌ 请求错误:', error.message);
      resolve({ status: 0, error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

// 主测试流程
async function main() {
  try {
    // 测试登录
    const token = await testLogin();
    
    // 测试有效 token (如果有的话)
    if (token) {
      await testCheckout(token);
    } else {
      console.log('\n⚠️  无法获取有效 token，跳过有效 token 测试');
    }
    
    // 测试无效 token
    await testInvalidToken();
    
    // 测试无 token
    await testCheckout(null);
    
    console.log('\n📊 诊断总结:');
    console.log('1. 检查 JWT_SECRET 环境变量是否正确设置');
    console.log('2. 检查前端是否正确存储和发送 token');
    console.log('3. 检查 token 是否过期');
    console.log('4. 检查 Authorization header 格式是否正确');
    console.log('5. 检查服务器是否正在运行');
    
  } catch (error) {
    console.error('\n💥 诊断过程出错:', error.message);
  }
}

main();
