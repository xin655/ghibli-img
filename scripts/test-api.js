#!/usr/bin/env node

/**
 * API测试脚本
 * 用于验证所有API端点是否正常工作
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// 测试用例
const tests = [
  {
    name: '主页加载测试',
    method: 'GET',
    path: '/',
    expectedStatus: 200
  },
  {
    name: '订阅API - 无效token测试',
    method: 'POST',
    path: '/api/billing/checkout',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid_token'
    },
    body: JSON.stringify({ plan: 'basic' }),
    expectedStatus: 401
  },
  {
    name: '认证API - 无效token测试',
    method: 'POST',
    path: '/api/auth',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id_token: 'invalid_token' }),
    expectedStatus: 400
  }
];

function makeRequest(test) {
  return new Promise((resolve, reject) => {
    const url = new URL(test.path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: test.method,
      headers: test.headers || {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (test.body) {
      req.write(test.body);
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 开始API测试...\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`📋 测试: ${test.name}`);
      const response = await makeRequest(test);
      
      if (response.status === test.expectedStatus) {
        console.log(`✅ 通过 - 状态码: ${response.status}`);
        passed++;
      } else {
        console.log(`❌ 失败 - 期望状态码: ${test.expectedStatus}, 实际状态码: ${response.status}`);
        if (response.data) {
          console.log(`   响应内容: ${response.data.substring(0, 200)}...`);
        }
        failed++;
      }
    } catch (error) {
      console.log(`❌ 错误 - ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('📊 测试结果:');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查服务器状态');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(console.error);

