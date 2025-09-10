const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// 用户模型
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  photo: { type: String, default: '' },
  googleId: { type: String, unique: true, sparse: true },
  usage: {
    freeTrialsRemaining: { type: Number, default: 0 },
    totalTransformations: { type: Number, default: 0 }
  },
  subscription: {
    isActive: { type: Boolean, default: false },
    plan: { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' },
    stripeCustomerId: { type: String, default: '' },
    stripeSubscriptionId: { type: String, default: '' },
    currentPeriodEnd: { type: Date, default: null }
  }
}, { timestamps: true });

// 订阅记录模型
const subscriptionRecordSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  stripeSubscriptionId: { type: String, required: true },
  stripeCustomerId: { type: String, required: true },
  plan: { type: String, required: true },
  status: { type: String, required: true },
  currentPeriodStart: { type: Date, default: Date.now },
  currentPeriodEnd: { type: Date, required: true },
  priceId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'usd' },
  interval: { type: String, default: 'month' },
  intervalCount: { type: Number, default: 1 },
  quantity: { type: Number, default: 1 },
  metadata: { type: Object, default: {} },
  stripeData: { type: Object, default: {} }
}, { timestamps: true });

// 支付信息模型
const paymentInfoSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  stripePaymentIntentId: { type: String, required: true },
  stripeCustomerId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'usd' },
  status: { type: String, required: true },
  description: { type: String, default: '' },
  paymentDate: { type: Date, default: Date.now },
  metadata: { type: Object, default: {} },
  stripeData: { type: Object, default: {} }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const SubscriptionRecord = mongoose.model('SubscriptionRecord', subscriptionRecordSchema);
const PaymentInfo = mongoose.model('PaymentInfo', paymentInfoSchema);

// 填充测试数据
async function populateTestData() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ghibli-img');
    console.log('✅ 数据库连接成功');

    // 查找管理员用户
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (!adminUser) {
      console.log('❌ 未找到管理员用户');
      return;
    }

    console.log(`✅ 找到管理员用户: ${adminUser.email}`);

    // 创建多个订阅记录
    const subscriptions = [
      {
        userId: adminUser._id.toString(),
        stripeSubscriptionId: 'sub_basic_001',
        stripeCustomerId: 'cus_admin_001',
        plan: 'basic',
        status: 'active',
        currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
        priceId: 'price_basic_test',
        amount: 999,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        quantity: 1,
        metadata: { source: 'test_data', plan: 'basic' },
        stripeData: {}
      },
      {
        userId: adminUser._id.toString(),
        stripeSubscriptionId: 'sub_pro_001',
        stripeCustomerId: 'cus_admin_001',
        plan: 'pro',
        status: 'active',
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15天前
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15天后
        priceId: 'price_pro_test',
        amount: 1999,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        quantity: 1,
        metadata: { source: 'test_data', plan: 'pro' },
        stripeData: {}
      },
      {
        userId: adminUser._id.toString(),
        stripeSubscriptionId: 'sub_enterprise_001',
        stripeCustomerId: 'cus_admin_001',
        plan: 'enterprise',
        status: 'active',
        currentPeriodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
        currentPeriodEnd: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // 23天后
        priceId: 'price_enterprise_test',
        amount: 4999,
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        quantity: 1,
        metadata: { source: 'test_data', plan: 'enterprise' },
        stripeData: {}
      }
    ];

    // 删除现有订阅记录
    await SubscriptionRecord.deleteMany({ userId: adminUser._id.toString() });
    console.log('🗑️ 清除现有订阅记录');

    // 创建新的订阅记录
    for (const subData of subscriptions) {
      const subscription = new SubscriptionRecord(subData);
      await subscription.save();
      console.log(`✅ 创建 ${subData.plan} 订阅记录: ${subData.stripeSubscriptionId}`);
    }

    // 创建支付记录
    const payments = [
      {
        userId: adminUser._id.toString(),
        stripePaymentIntentId: 'pi_basic_001',
        stripeCustomerId: 'cus_admin_001',
        amount: 999,
        currency: 'usd',
        status: 'succeeded',
        description: 'Basic Plan Payment',
        paymentDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        metadata: { source: 'test_data', plan: 'basic' },
        stripeData: {}
      },
      {
        userId: adminUser._id.toString(),
        stripePaymentIntentId: 'pi_pro_001',
        stripeCustomerId: 'cus_admin_001',
        amount: 1999,
        currency: 'usd',
        status: 'succeeded',
        description: 'Pro Plan Payment',
        paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        metadata: { source: 'test_data', plan: 'pro' },
        stripeData: {}
      },
      {
        userId: adminUser._id.toString(),
        stripePaymentIntentId: 'pi_enterprise_001',
        stripeCustomerId: 'cus_admin_001',
        amount: 4999,
        currency: 'usd',
        status: 'succeeded',
        description: 'Enterprise Plan Payment',
        paymentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        metadata: { source: 'test_data', plan: 'enterprise' },
        stripeData: {}
      }
    ];

    // 删除现有支付记录
    await PaymentInfo.deleteMany({ userId: adminUser._id.toString() });
    console.log('🗑️ 清除现有支付记录');

    // 创建新的支付记录
    for (const paymentData of payments) {
      const payment = new PaymentInfo(paymentData);
      await payment.save();
      console.log(`✅ 创建 ${paymentData.description}: $${(paymentData.amount / 100).toFixed(2)}`);
    }

    // 更新用户使用量
    adminUser.usage.totalTransformations = 150; // 设置一些使用量
    await adminUser.save();
    console.log('✅ 更新用户使用量');

    // 统计创建的数据
    const subscriptionCount = await SubscriptionRecord.countDocuments({ userId: adminUser._id.toString() });
    const paymentCount = await PaymentInfo.countDocuments({ userId: adminUser._id.toString() });
    
    console.log('\n📊 数据统计:');
    console.log(`   订阅记录数: ${subscriptionCount}`);
    console.log(`   支付记录数: ${paymentCount}`);
    console.log(`   用户使用量: ${adminUser.usage.totalTransformations}`);

    console.log('\n🎉 测试数据填充完成！');

  } catch (error) {
    console.error('❌ 填充测试数据时出错:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ 数据库连接已关闭');
  }
}

populateTestData();

