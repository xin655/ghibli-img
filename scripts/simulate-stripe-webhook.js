const http = require('http');
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

// 模拟Stripe webhook事件数据
const mockWebhookEvents = {
  'checkout.session.completed': {
    id: 'evt_test_webhook',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_mock_session',
        object: 'checkout.session',
        customer: 'cus_T1NTQ2jS1V8XVZ',
        subscription: 'sub_test_mock_subscription',
        metadata: {
          appUserId: '68bfc35e2c9a8cc9d8d876f6',
          plan: 'basic'
        }
      }
    }
  },
  'customer.subscription.updated': {
    id: 'evt_test_webhook_update',
    object: 'event',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_test_mock_subscription',
        object: 'subscription',
        customer: 'cus_T1NTQ2jS1V8XVZ',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
        items: {
          data: [{
            price: {
              id: 'price_1S5KqnETPwR1qydL3HqQgTeR',
              unit_amount: 999,
              currency: 'usd'
            }
          }]
        }
      }
    }
  },
  'customer.subscription.deleted': {
    id: 'evt_test_webhook_delete',
    object: 'event',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_test_mock_subscription',
        object: 'subscription',
        customer: 'cus_T1NTQ2jS1V8XVZ',
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000)
      }
    }
  }
};

// 发送webhook请求
function sendWebhook(eventType, eventData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(eventData);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/billing/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'stripe-signature': 't=1234567890,v1=mock_signature' // 模拟签名
      }
    };

    console.log(`📤 发送 ${eventType} webhook...`);
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`📊 响应状态: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log('✅ Webhook处理成功');
          resolve(data);
        } else {
          console.error('❌ Webhook处理失败:', data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('请求错误:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 检查用户状态
async function checkUserStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const user = await User.findOne({ email: 'test@example.com' });
    
    if (!user) {
      console.log('❌ 未找到测试用户');
      return null;
    }

    console.log('\n📋 当前用户状态:');
    console.log(`  用户ID: ${user._id}`);
    console.log(`  订阅计划: ${user.subscription?.plan || 'free'}`);
    console.log(`  订阅状态: ${user.subscription?.isActive ? '✅ 活跃' : '❌ 非活跃'}`);
    console.log(`  Stripe客户ID: ${user.subscription?.stripeCustomerId || '未设置'}`);
    console.log(`  Stripe订阅ID: ${user.subscription?.stripeSubscriptionId || '未设置'}`);
    console.log(`  试用次数: ${user.usage?.freeTrialsRemaining || 0}`);
    console.log(`  最后更新: ${user.updatedAt}`);
    
    return user;
  } catch (error) {
    console.error('❌ 检查用户状态错误:', error);
    return null;
  } finally {
    await mongoose.disconnect();
  }
}

// 主测试流程
async function main() {
  try {
    console.log('🚀 开始模拟Stripe Webhook测试...\n');
    
    // 1. 检查初始状态
    console.log('1️⃣ 检查初始用户状态:');
    await checkUserStatus();
    
    // 2. 模拟订阅成功
    console.log('\n2️⃣ 模拟订阅成功 (checkout.session.completed):');
    await sendWebhook('checkout.session.completed', mockWebhookEvents['checkout.session.completed']);
    
    // 等待一下让处理完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 检查订阅成功后的状态
    console.log('\n3️⃣ 检查订阅成功后的状态:');
    await checkUserStatus();
    
    // 4. 模拟订阅更新
    console.log('\n4️⃣ 模拟订阅更新 (customer.subscription.updated):');
    await sendWebhook('customer.subscription.updated', mockWebhookEvents['customer.subscription.updated']);
    
    // 等待一下让处理完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 5. 检查订阅更新后的状态
    console.log('\n5️⃣ 检查订阅更新后的状态:');
    await checkUserStatus();
    
    // 6. 模拟订阅取消
    console.log('\n6️⃣ 模拟订阅取消 (customer.subscription.deleted):');
    await sendWebhook('customer.subscription.deleted', mockWebhookEvents['customer.subscription.deleted']);
    
    // 等待一下让处理完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 7. 检查订阅取消后的状态
    console.log('\n7️⃣ 检查订阅取消后的状态:');
    await checkUserStatus();
    
    console.log('\n🎉 模拟Stripe Webhook测试完成！');
    
  } catch (error) {
    console.error('\n💥 测试失败:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  sendWebhook,
  checkUserStatus,
  mockWebhookEvents
};

