const http = require('http');

const postData = JSON.stringify({ plan: 'basic' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/billing/checkout',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer test-token'  // 不使用跳过验证
  }
};

console.log('发送请求到:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('请求头:', options.headers);
console.log('请求体:', postData);

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('响应体:', data);
  });
});

req.on('error', (error) => {
  console.error('请求错误:', error);
});

req.write(postData);
req.end();

