const jwt = require('jsonwebtoken');

// 生成新的测试token
function generateTestToken() {
  console.log('🔑 生成新的测试token...\n');

  const JWT_SECRET = 'your-secret-key'; // 使用与登录页面相同的密钥
  
  // 测试用户数据
  const testUserPayload = {
    userId: '68bfc35e2c9a8cc9d8d876f6', // 使用现有的用户ID
    email: 'test@example.com',
    googleId: 'test-google-id-123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7天后过期
  };

  try {
    // 生成新的JWT token
    const newToken = jwt.sign(testUserPayload, JWT_SECRET);
    
    console.log('✅ 新的测试token已生成:');
    console.log(newToken);
    
    console.log('\n📋 Token信息:');
    console.log(`   用户ID: ${testUserPayload.userId}`);
    console.log(`   邮箱: ${testUserPayload.email}`);
    console.log(`   签发时间: ${new Date(testUserPayload.iat * 1000).toLocaleString()}`);
    console.log(`   过期时间: ${new Date(testUserPayload.exp * 1000).toLocaleString()}`);
    
    console.log('\n🔧 更新登录页面:');
    console.log('请将以下token复制到 app/login/page.tsx 文件中:');
    console.log(`const mockToken = '${newToken}';`);
    
    // 验证token
    try {
      const decoded = jwt.verify(newToken, JWT_SECRET);
      console.log('\n✅ Token验证成功:');
      console.log(`   解码后的用户ID: ${decoded.userId}`);
      console.log(`   解码后的邮箱: ${decoded.email}`);
    } catch (verifyError) {
      console.log('\n❌ Token验证失败:', verifyError.message);
    }
    
  } catch (error) {
    console.error('❌ 生成token失败:', error.message);
  }
}

generateTestToken();
