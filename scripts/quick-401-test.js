#!/usr/bin/env node

/**
 * 快速 401 错误测试脚本
 */

const http = require('http');

console.log('🔍 快速 401 错误测试...\n');

// 测试无 token 的请求
function testNoToken() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ plan: 'basic' });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/billing/checkout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('📋 测试无 token 请求:');

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`   状态码: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          console.log(`   响应: ${JSON.stringify(response)}`);
        } catch {
          console.log(`   响应: ${data}`);
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log(`   错误: ${error.message}`);
      resolve({ status: 0, error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

// 测试无效 token
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

    console.log('\n📋 测试无效 token:');

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`   状态码: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          console.log(`   响应: ${JSON.stringify(response)}`);
        } catch {
          console.log(`   响应: ${data}`);
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log(`   错误: ${error.message}`);
      resolve({ status: 0, error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

// 测试格式错误的 Authorization header
function testMalformedAuth() {
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
        'Authorization': 'invalid-format'
      }
    };

    console.log('\n📋 测试格式错误的 Authorization header:');

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`   状态码: ${res.statusCode}`);
        try {
          const response = JSON.parse(data);
          console.log(`   响应: ${JSON.stringify(response)}`);
        } catch {
          console.log(`   响应: ${data}`);
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log(`   错误: ${error.message}`);
      resolve({ status: 0, error: error.message });
    });

    req.write(postData);
    req.end();
  });
}

// 主测试流程
async function main() {
  try {
    await testNoToken();
    await testInvalidToken();
    await testMalformedAuth();
    
    console.log('\n📊 测试总结:');
    console.log('如果所有测试都返回 401，说明服务器正在运行且身份验证正常工作');
    console.log('如果出现连接错误，请确保服务器正在运行 (npm run dev)');
    console.log('\n💡 可能的解决方案:');
    console.log('1. 确保用户已登录并获取有效 token');
    console.log('2. 检查 localStorage 中是否有有效的 jwt token');
    console.log('3. 检查 token 是否过期');
    console.log('4. 确保 Authorization header 格式正确: "Bearer <token>"');
    
  } catch (error) {
    console.error('\n💥 测试过程出错:', error.message);
  }
}

main();
