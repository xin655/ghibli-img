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
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`状态码: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          console.log('✅ 订阅成功!');
          console.log('Stripe Checkout URL:', response.url);
          if (response.url && response.url.includes('checkout.stripe.com')) {
            console.log('🎉 这是真实的Stripe Checkout URL!');
          }
          resolve(response);
        } else {
          console.error('❌ 订阅失败:', res.statusCode, data);
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
    console.log('🚀 测试修复后的订阅功能...\n');
    
    // 测试订阅
    await testSubscription('basic');
    
    console.log('\n🎉 测试完成！');
  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
  }
}

main();

