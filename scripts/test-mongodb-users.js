const mongoose = require('mongoose');
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

async function testUsers() {
  try {
    console.log('🔍 连接MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');

    console.log('\n📋 查询所有用户...');
    const users = await User.find({});
    console.log(`找到 ${users.length} 个用户:`);
    
    users.forEach((user, index) => {
      console.log(`\n用户 ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  邮箱: ${user.email}`);
      console.log(`  姓名: ${user.name}`);
      console.log(`  Google ID: ${user.googleId || '未设置'}`);
      console.log(`  订阅计划: ${user.subscription?.plan || 'free'}`);
      console.log(`  Stripe客户ID: ${user.subscription?.stripeCustomerId || '未设置'}`);
      console.log(`  免费试用剩余: ${user.usage?.freeTrialsRemaining || 0}`);
    });

    if (users.length === 0) {
      console.log('\n⚠️ 没有找到用户，创建一个测试用户...');
      const testUser = await User.create({
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
      console.log('✅ 测试用户创建成功:', testUser._id);
    }

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

testUsers();

