const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// 导入模型
const User = require('../app/models/User').default;
const SubscriptionRecord = require('../app/models/SubscriptionRecord').default;
const PaymentInfo = require('../app/models/PaymentInfo').default;

async function checkDatabaseRecords() {
  try {
    console.log('🔍 连接MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');

    const userId = '68bfc35e2c9a8cc9d8d876f6';

    // 检查用户记录
    console.log('👤 检查用户记录...');
    const user = await User.findById(userId);
    if (user) {
      console.log(`✅ 用户存在: ${user.email}`);
      console.log(`   订阅计划: ${user.subscription?.plan || 'free'}`);
      console.log(`   订阅状态: ${user.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   Stripe客户ID: ${user.subscription?.stripeCustomerId || '无'}`);
      console.log(`   Stripe订阅ID: ${user.subscription?.stripeSubscriptionId || '无'}`);
    } else {
      console.log('❌ 用户不存在');
    }

    // 检查订阅记录
    console.log('\n📋 检查订阅记录...');
    const subscriptionRecords = await SubscriptionRecord.find({ userId });
    console.log(`📊 订阅记录数量: ${subscriptionRecords.length}`);
    
    if (subscriptionRecords.length > 0) {
      subscriptionRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. 计划: ${record.plan}, 状态: ${record.status}, 创建时间: ${record.createdAt}`);
      });
    } else {
      console.log('   ⚠️ 没有订阅记录');
    }

    // 检查支付记录
    console.log('\n💳 检查支付记录...');
    const paymentRecords = await PaymentInfo.find({ userId });
    console.log(`📊 支付记录数量: ${paymentRecords.length}`);
    
    if (paymentRecords.length > 0) {
      paymentRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. 金额: ${record.amount}, 状态: ${record.status}, 创建时间: ${record.createdAt}`);
      });
    } else {
      console.log('   ⚠️ 没有支付记录');
    }

    // 检查订阅日志
    console.log('\n📝 检查订阅日志...');
    const SubscriptionLog = require('../app/models/SubscriptionLog').default;
    const subscriptionLogs = await SubscriptionLog.find({ userId });
    console.log(`📊 订阅日志数量: ${subscriptionLogs.length}`);
    
    if (subscriptionLogs.length > 0) {
      subscriptionLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. 操作: ${log.action}, 计划: ${log.toPlan}, 状态: ${log.status}, 时间: ${log.createdAt}`);
      });
    } else {
      console.log('   ⚠️ 没有订阅日志');
    }

  } catch (error) {
    console.error('❌ 检查过程中出错:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

checkDatabaseRecords();

