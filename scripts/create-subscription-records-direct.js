const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// 导入模型和服务
const User = require('../app/models/User').default;
const SubscriptionRecord = require('../app/models/SubscriptionRecord').default;
const PaymentInfo = require('../app/models/PaymentInfo').default;
const { LoggingService } = require('../app/lib/services/LoggingService');

async function createSubscriptionRecordsDirect() {
  try {
    console.log('🔧 直接创建订阅记录...\n');
    
    console.log('🔍 连接MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功\n');

    const userId = '68bfc35e2c9a8cc9d8d876f6';

    // 检查用户
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }

    console.log(`✅ 找到用户: ${user.email}`);
    console.log(`   当前计划: ${user.subscription?.plan || 'free'}`);
    console.log(`   订阅状态: ${user.subscription?.isActive ? '活跃' : '未激活'}`);

    // 创建订阅记录
    console.log('\n📋 创建订阅记录...');
    const subscriptionRecord = await LoggingService.logSubscriptionRecord({
      userId: userId,
      stripeSubscriptionId: 'sub_test_enterprise_123',
      stripeCustomerId: user.subscription?.stripeCustomerId || 'cus_test_123',
      plan: user.subscription?.plan || 'enterprise',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
      trialStart: undefined,
      trialEnd: undefined,
      cancelAtPeriodEnd: false,
      canceledAt: undefined,
      endedAt: undefined,
      priceId: 'price_enterprise_test',
      amount: 4999, // $49.99
      currency: 'usd',
      interval: 'month',
      intervalCount: 1,
      quantity: 1,
      metadata: {
        test: true,
        createdBy: 'manual_script'
      },
      stripeData: {
        id: 'sub_test_enterprise_123',
        status: 'active',
        plan: {
          id: 'price_enterprise_test',
          amount: 4999,
          currency: 'usd'
        }
      }
    });

    console.log('✅ 订阅记录创建成功');

    // 创建支付记录
    console.log('\n💳 创建支付记录...');
    const paymentRecord = await LoggingService.logPayment({
      userId: userId,
      subscriptionId: 'sub_test_enterprise_123',
      paymentIntentId: 'pi_test_payment_123',
      invoiceId: 'in_test_invoice_123',
      chargeId: 'ch_test_charge_123',
      amount: 4999,
      currency: 'usd',
      status: 'succeeded',
      paymentMethod: {
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expMonth: 12,
        expYear: 2025,
        country: 'US'
      },
      billingDetails: {
        name: 'Test User',
        email: 'test@example.com',
        phone: null,
        address: {
          line1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'US'
        }
      },
      description: 'Enterprise subscription payment',
      receiptUrl: 'https://pay.stripe.com/receipts/test_receipt_123',
      paidAt: new Date(),
      metadata: {
        test: true,
        createdBy: 'manual_script'
      },
      stripeData: {
        id: 'pi_test_payment_123',
        status: 'succeeded'
      }
    });

    console.log('✅ 支付记录创建成功');

    // 检查创建结果
    console.log('\n🔍 检查创建结果...');
    
    const subscriptionRecords = await SubscriptionRecord.find({ userId });
    console.log(`📊 订阅记录数量: ${subscriptionRecords.length}`);
    
    const paymentRecords = await PaymentInfo.find({ userId });
    console.log(`📊 支付记录数量: ${paymentRecords.length}`);

    if (subscriptionRecords.length > 0) {
      console.log('   订阅记录:');
      subscriptionRecords.forEach((record, index) => {
        console.log(`     ${index + 1}. 计划: ${record.plan}, 状态: ${record.status}, 金额: ${record.amount/100} ${record.currency}`);
      });
    }

    if (paymentRecords.length > 0) {
      console.log('   支付记录:');
      paymentRecords.forEach((record, index) => {
        console.log(`     ${index + 1}. 金额: ${record.amount/100} ${record.currency}, 状态: ${record.status}`);
      });
    }

    console.log('\n🎉 订阅记录创建完成！');

  } catch (error) {
    console.error('❌ 创建过程中出错:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

createSubscriptionRecordsDirect();

