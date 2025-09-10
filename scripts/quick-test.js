const http = require('http');

const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

const postData = JSON.stringify({ plan: 'basic' });

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

console.log('🧪 测试订阅功能...');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`状态码: ${res.statusCode}`);
    console.log(`响应:`, data);
    
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ 成功! Stripe URL:', response.url);
    } else {
      console.log('❌ 失败');
    }
  });
});

req.on('error', (error) => {
  console.error('请求错误:', error);
});

req.write(postData);
req.end();

