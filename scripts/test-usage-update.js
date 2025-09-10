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

// 模拟试用次数更新逻辑
function updateUserUsageForPlan(user, plan) {
  const CONFIG = {
    SUBSCRIPTION: {
      PLANS: {
        BASIC: { conversions: 500 },
        PRO: { conversions: 2000 },
        ENTERPRISE: { conversions: -1 }
      }
    },
    FREE_TRIAL: {
      AUTHENTICATED_USER_LIMIT: 100
    }
  };

  const planConfig = CONFIG.SUBSCRIPTION.PLANS[plan.toUpperCase()];
  
  if (planConfig) {
    if (planConfig.conversions === -1) {
      user.usage.freeTrialsRemaining = -1; // 无限制
    } else {
      user.usage.freeTrialsRemaining = planConfig.conversions;
    }
    
    console.log(`✅ 用户 ${user._id} 订阅 ${plan} 计划，试用次数更新为: ${user.usage.freeTrialsRemaining}`);
  }
}

async function testUsageUpdate() {
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
    console.log(`  当前订阅计划: ${user.subscription?.plan || 'free'}`);
    console.log(`  订阅状态: ${user.subscription?.isActive ? '活跃' : '非活跃'}`);
    console.log(`  当前试用次数: ${user.usage.freeTrialsRemaining}`);
    console.log(`  总转换次数: ${user.usage.totalTransformations}`);

    // 测试不同订阅计划的试用次数更新
    console.log('\n🧪 测试订阅计划试用次数更新:');
    
    // 测试基础套餐
    console.log('\n1. 测试基础套餐 (500次):');
    updateUserUsageForPlan(user, 'basic');
    console.log(`   更新后试用次数: ${user.usage.freeTrialsRemaining}`);
    
    // 测试专业套餐
    console.log('\n2. 测试专业套餐 (2000次):');
    updateUserUsageForPlan(user, 'pro');
    console.log(`   更新后试用次数: ${user.usage.freeTrialsRemaining}`);
    
    // 测试企业套餐
    console.log('\n3. 测试企业套餐 (无限制):');
    updateUserUsageForPlan(user, 'enterprise');
    console.log(`   更新后试用次数: ${user.usage.freeTrialsRemaining} (${user.usage.freeTrialsRemaining === -1 ? '无限制' : '有限制'})`);

    // 测试订阅取消
    console.log('\n4. 测试订阅取消 (恢复100次):');
    user.usage.freeTrialsRemaining = 100;
    console.log(`   恢复后试用次数: ${user.usage.freeTrialsRemaining}`);

    console.log('\n🎉 试用次数更新逻辑测试完成！');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

testUsageUpdate();

