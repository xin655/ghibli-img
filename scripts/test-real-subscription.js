const http = require('http');

// 首先模拟登录获取JWT token
function login() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'test@example.com',
      name: 'Test User',
      photo: '',
      googleId: 'test-google-id'
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

    console.log('🔐 模拟登录...');
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          console.log('✅ 登录成功，获得JWT token');
          resolve(response.token);
        } else {
          console.error('❌ 登录失败:', res.statusCode, data);
          reject(new Error('Login failed'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('登录请求错误:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 使用JWT token测试订阅
function testSubscription(token, plan) {
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
          if (response.mock) {
            console.log('⚠️ 这是模拟响应:', response.message);
          }
          resolve(response);
        } else {
          console.error('❌ 订阅失败:', res.statusCode, data);
          reject(new Error('Subscription failed'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('订阅请求错误:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 主测试流程
async function main() {
  try {
    console.log('🚀 开始真实订阅流程测试...\n');
    
    // 1. 登录获取token
    const token = await login();
    console.log('');
    
    // 2. 测试订阅
    await testSubscription(token, 'basic');
    
    console.log('\n🎉 测试完成！');
  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
  }
}

main();

