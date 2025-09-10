const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

async function generateToken() {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not found in environment variables');
    }

    console.log('🔑 JWT Secret 长度:', jwtSecret.length);
    console.log('🔑 JWT Secret 前10个字符:', jwtSecret.substring(0, 10));

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: '68bfc35e2c9a8cc9d8d876f6', // 使用之前创建的用户ID
        email: 'test@example.com',
        googleId: 'test-google-id-123'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    console.log('\n🎫 生成的JWT Token:');
    console.log(token);
    console.log('\n📏 Token 长度:', token.length);

    // 验证token
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log('\n✅ Token 验证成功:');
      console.log(decoded);
    } catch (verifyError) {
      console.error('\n❌ Token 验证失败:', verifyError.message);
    }

    return token;

  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

generateToken();

