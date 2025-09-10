const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// 连接MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    process.exit(1);
  }
}

// 测试日期处理
async function testDateHandling() {
  console.log('🧪 测试日期处理...\n');

  await connectDB();

  // 导入User模型
  const User = require('../app/models/User').default;

  try {
    // 查找测试用户
    const user = await User.findById('68bfc35e2c9a8cc9d8d876f6');
    
    if (!user) {
      console.log('❌ 测试用户不存在');
      return;
    }

    console.log('📋 当前用户状态:');
    console.log(`  用户ID: ${user._id}`);
    console.log(`  订阅计划: ${user.subscription?.plan || 'free'}`);
    console.log(`  订阅状态: ${user.subscription?.isActive ? '✅ 活跃' : '❌ 未活跃'}`);
    console.log(`  订阅到期时间: ${user.subscription?.currentPeriodEnd || '未设置'}`);
    console.log(`  试用次数: ${user.usage.freeTrialsRemaining}`);

    // 测试更新订阅信息（模拟webhook处理）
    console.log('\n🔄 测试订阅信息更新...');
    
    const testPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30天后
    
    user.subscription = {
      ...(user.subscription || {}),
      plan: 'pro',
      isActive: true,
      stripeCustomerId: user.subscription?.stripeCustomerId || 'cus_test_123',
      stripeSubscriptionId: 'sub_test_123',
      currentPeriodEnd: testPeriodEnd,
    };

    // 更新试用次数
    user.usage.freeTrialsRemaining = 2000; // Pro计划

    await user.save();
    console.log('✅ 订阅信息更新成功');

    // 验证更新结果
    const updatedUser = await User.findById('68bfc35e2c9a8cc9d8d876f6');
    console.log('\n📋 更新后用户状态:');
    console.log(`  订阅计划: ${updatedUser.subscription?.plan}`);
    console.log(`  订阅状态: ${updatedUser.subscription?.isActive ? '✅ 活跃' : '❌ 未活跃'}`);
    console.log(`  订阅到期时间: ${updatedUser.subscription?.currentPeriodEnd}`);
    console.log(`  试用次数: ${updatedUser.usage.freeTrialsRemaining}`);

    console.log('\n🎉 日期处理测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error);
    
    if (error.name === 'ValidationError') {
      console.error('验证错误详情:', error.errors);
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

// 运行测试
testDateHandling();

