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
    freeTrialsRemaining: { type: Number, default: 100 },
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

async function checkUserStatus() {
  try {
    console.log('🔍 连接MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');

    // 查找测试用户
    const user = await User.findOne({ email: 'test@example.com' });
    
    if (!user) {
      console.log('❌ 未找到测试用户');
      return;
    }

    console.log('\n📋 当前用户状态:');
    console.log(`  用户ID: ${user._id}`);
    console.log(`  邮箱: ${user.email}`);
    console.log(`  姓名: ${user.name}`);
    console.log(`  当前订阅计划: ${user.subscription?.plan || 'free'}`);
    console.log(`  订阅状态: ${user.subscription?.isActive ? '✅ 活跃' : '❌ 非活跃'}`);
    console.log(`  Stripe客户ID: ${user.subscription?.stripeCustomerId || '未设置'}`);
    console.log(`  Stripe订阅ID: ${user.subscription?.stripeSubscriptionId || '未设置'}`);
    console.log(`  订阅到期时间: ${user.subscription?.currentPeriodEnd || '未设置'}`);
    console.log(`  当前试用次数: ${user.usage?.freeTrialsRemaining || 0}`);
    console.log(`  总转换次数: ${user.usage?.totalTransformations || 0}`);
    console.log(`  最后更新: ${user.updatedAt}`);

    // 检查试用次数是否按计划更新
    const plan = user.subscription?.plan;
    if (plan && plan !== 'free') {
      console.log(`\n🔍 检查 ${plan} 计划的试用次数设置:`);
      
      const expectedUsage = {
        'basic': 500,
        'pro': 2000,
        'enterprise': -1
      };
      
      const expected = expectedUsage[plan];
      const actual = user.usage?.freeTrialsRemaining;
      
      if (expected === actual) {
        console.log(`✅ 试用次数正确: ${actual} (${actual === -1 ? '无限制' : '有限制'})`);
      } else {
        console.log(`❌ 试用次数不匹配: 期望 ${expected}, 实际 ${actual}`);
      }
    }

    console.log('\n🎉 用户状态检查完成！');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

checkUserStatus();

