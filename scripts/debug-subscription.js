const http = require('http');

// 使用有效的JWT token
const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

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
        'Authorization': `Bearer ${validToken}`
      }
    };

    console.log(`🧪 测试订阅计划: ${plan}`);
    console.log(`🔑 Token: ${validToken.substring(0, 50)}...`);
    console.log(`📤 请求体: ${postData}`);
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`\n📊 响应状态: ${res.statusCode}`);
        console.log(`📋 响应头:`, JSON.stringify(res.headers, null, 2));
        console.log(`📄 响应体:`, data);
        
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          console.log('\n✅ 订阅成功!');
          console.log('Stripe Checkout URL:', response.url);
          if (response.mock) {
            console.log('⚠️ 这是模拟响应:', response.message);
          } else {
            console.log('🎉 这是真实的Stripe Checkout URL!');
          }
          resolve(response);
        } else {
          console.error('\n❌ 订阅失败');
          try {
            const errorResponse = JSON.parse(data);
            console.error('错误详情:', errorResponse);
          } catch (e) {
            console.error('原始错误响应:', data);
          }
          reject(new Error('Subscription failed'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('请求错误:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 主测试流程
async function main() {
  try {
    console.log('🚀 开始订阅流程调试...\n');
    
    // 测试订阅
    await testSubscription('basic');
    
    console.log('\n🎉 测试完成！');
  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
  }
}

main();

