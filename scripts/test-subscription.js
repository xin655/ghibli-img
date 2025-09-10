#!/usr/bin/env node

/**
 * 订阅功能测试脚本
 * 用于测试跳过登录验证的订阅流程
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// 测试订阅API（跳过验证）
function testSubscription(plan) {
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
        'x-skip-auth': 'true'  // 跳过验证的头部
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runSubscriptionTests() {
  console.log('🧪 开始订阅功能测试（跳过验证模式）...\n');

  const plans = ['basic', 'pro', 'enterprise'];
  
  for (const plan of plans) {
    try {
      console.log(`📋 测试订阅计划: ${plan}`);
      const response = await testSubscription(plan);
      
      console.log(`   状态码: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`✅ 成功 - 获得Stripe Checkout URL`);
        if (response.data.url) {
          console.log(`   Checkout URL: ${response.data.url.substring(0, 100)}...`);
        }
      } else if (response.status === 400) {
        console.log(`⚠️  计划无效 - ${response.data.error || '未知错误'}`);
      } else if (response.status === 500) {
        console.log(`❌ 服务器错误 - ${response.data.error || '未知错误'}`);
      } else {
        console.log(`❌ 意外状态码 - ${response.status}`);
        console.log(`   响应: ${JSON.stringify(response.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`❌ 请求错误 - ${error.message}`);
    }
    console.log('');
  }

  console.log('📊 测试完成！');
  console.log('💡 如果看到Stripe Checkout URL，说明订阅功能正常工作');
  console.log('💡 如果看到服务器错误，请检查Stripe配置');
}

// 运行测试
runSubscriptionTests().catch(console.error);

