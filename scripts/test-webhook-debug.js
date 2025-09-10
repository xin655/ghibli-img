const fetch = require('node-fetch');

// 测试webhook调试
async function testWebhookDebug() {
  console.log('🧪 测试webhook调试...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // 发送一个简单的webhook事件
    const simpleEvent = {
      id: 'evt_test_debug',
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_debug_123',
          object: 'subscription',
          status: 'active',
          customer: 'cus_test_debug_123',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          items: {
            data: [{
              price: {
                id: 'price_basic_test',
                unit_amount: 999,
                currency: 'usd',
                recurring: {
                  interval: 'month',
                  interval_count: 1
                }
              },
              quantity: 1
            }]
          },
          currency: 'usd',
          cancel_at_period_end: false
        }
      }
    };

    console.log('📤 发送调试webhook事件...');
    console.log(`   事件类型: ${simpleEvent.type}`);
    console.log(`   订阅ID: ${simpleEvent.data.object.id}`);
    console.log(`   客户ID: ${simpleEvent.data.object.customer}`);
    console.log(`   价格ID: ${simpleEvent.data.object.items.data[0].price.id}`);
    console.log(`   金额: $${simpleEvent.data.object.items.data[0].price.unit_amount / 100}`);

    const webhookResponse = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(simpleEvent)
    });

    console.log(`📥 Webhook响应状态: ${webhookResponse.status}`);
    const webhookResponseText = await webhookResponse.text();
    console.log(`📥 Webhook响应内容: ${webhookResponseText}`);

    if (webhookResponse.ok) {
      console.log('✅ 调试webhook处理成功');
    } else {
      console.log('❌ 调试webhook处理失败');
    }

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testWebhookDebug();

