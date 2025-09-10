const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });

// 定义User模型
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  photo: { type: String, default: '' },
  googleId: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
  usage: {
    freeTrialsRemaining: { type: Number, default: 3 },
    totalTransformations: { type: Number, default: 0 },
  },
  subscription: {
    plan: { type: String, default: 'free' },
    isActive: { type: Boolean, default: false },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    currentPeriodEnd: { type: Date },
  },
});

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    console.log('🔍 连接MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');

    // 检查是否已存在测试用户
    let user = await User.findOne({ email: 'test@example.com' });
    
    if (user) {
      console.log('✅ 测试用户已存在:', user._id);
    } else {
      console.log('👤 创建测试用户...');
      user = await User.create({
        email: 'test@example.com',
        name: 'Test User',
        photo: '',
        googleId: 'test-google-id-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        usage: {
          freeTrialsRemaining: 3,
          totalTransformations: 0,
        },
        subscription: {
          plan: 'free',
          isActive: false,
        }
      });
      console.log('✅ 测试用户创建成功:', user._id);
    }

    // 生成JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not found in environment variables');
    }

    const token = jwt.sign(
      { 
        userId: user._id.toString(), 
        email: user.email,
        googleId: user.googleId
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    console.log('\n🎫 JWT Token:');
    console.log(token);
    console.log('\n📋 用户信息:');
    console.log(`  ID: ${user._id}`);
    console.log(`  邮箱: ${user.email}`);
    console.log(`  姓名: ${user.name}`);
    console.log(`  订阅计划: ${user.subscription?.plan}`);
    console.log(`  免费试用剩余: ${user.usage?.freeTrialsRemaining}`);

    return { user, token };

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

createTestUser();

