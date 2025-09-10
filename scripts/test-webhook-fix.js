const fetch = require('node-fetch');

// 测试webhook修复
async function testWebhookFix() {
  console.log('🧪 测试webhook修复...\n');

  const webhookUrl = 'http://localhost:3000/api/billing/webhook';
  
  // 模拟checkout.session.completed事件
  const mockEvent = {
    id: 'evt_test_webhook',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        object: 'checkout.session',
        subscription: 'sub_test_123',
        customer: 'cus_test_123',
        metadata: {
          appUserId: '68bfc35e2c9a8cc9d8d876f6',
          plan: 'basic'
        }
      }
    }
  };

  try {
    console.log('📤 发送测试webhook事件...');
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature' // 在开发环境中可能会跳过验证
      },
      body: JSON.stringify(mockEvent)
    });

    console.log(`📥 响应状态: ${response.status}`);
    const responseText = await response.text();
    console.log(`📥 响应内容: ${responseText}`);

    if (response.ok) {
      console.log('✅ Webhook测试成功！');
    } else {
      console.log('❌ Webhook测试失败');
    }

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

// 运行测试
testWebhookFix();

