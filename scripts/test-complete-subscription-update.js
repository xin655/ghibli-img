const fetch = require('node-fetch');

// 测试完整的订阅更新
async function testCompleteSubscriptionUpdate() {
  console.log('🧪 测试完整订阅更新...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 1. 检查当前状态
    console.log('📊 检查当前订阅状态...');
    const currentStatsResponse = await fetch(`${baseUrl}/api/billing/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (currentStatsResponse.ok) {
      const currentStats = await currentStatsResponse.json();
      console.log('✅ 当前状态:');
      console.log(`   计划: ${currentStats.subscription?.plan || 'free'}`);
      console.log(`   状态: ${currentStats.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   剩余次数: ${currentStats.usage?.freeTrialsRemaining || 0}`);
    }

    // 2. 模拟完整的订阅更新 (从basic到pro)
    console.log('\n🔄 模拟订阅升级 (Basic -> Pro)...');
    
    const completeUpdateEvent = {
      id: 'evt_test_complete_update',
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_enterprise_123', // 使用相同的订阅ID
          object: 'subscription',
          status: 'active',
          customer: 'cus_test_enterprise_123',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          items: {
            data: [{
              price: {
                id: 'price_pro_test', // Pro计划价格ID
                unit_amount: 1999, // $19.99 (Pro价格)
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

    console.log('📤 发送webhook事件...');
    console.log(`   订阅ID: ${completeUpdateEvent.data.object.id}`);
    console.log(`   价格ID: ${completeUpdateEvent.data.object.items.data[0].price.id}`);
    console.log(`   金额: $${completeUpdateEvent.data.object.items.data[0].price.unit_amount / 100}`);

    const webhookResponse = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(completeUpdateEvent)
    });

    console.log(`📥 Webhook响应状态: ${webhookResponse.status}`);
    const webhookResponseText = await webhookResponse.text();
    console.log(`📥 Webhook响应内容: ${webhookResponseText}`);

    if (webhookResponse.ok) {
      console.log('✅ 订阅更新webhook处理成功');
    } else {
      console.log('❌ 订阅更新webhook处理失败');
    }

    // 等待数据保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 检查更新后的状态
    console.log('\n📊 检查更新后的状态...');
    const newStatsResponse = await fetch(`${baseUrl}/api/billing/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (newStatsResponse.ok) {
      const newStats = await newStatsResponse.json();
      console.log('✅ 更新后状态:');
      console.log(`   计划: ${newStats.subscription?.plan || 'free'}`);
      console.log(`   状态: ${newStats.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   剩余次数: ${newStats.usage?.freeTrialsRemaining || 0}`);
    }

    // 4. 检查订阅记录详情
    console.log('\n🔄 检查订阅记录详情...');
    const subscriptionOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=subscription&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (subscriptionOrdersResponse.ok) {
      const subscriptionOrdersData = await subscriptionOrdersResponse.json();
      console.log('✅ 订阅记录详情:');
      console.log(`   订阅订单数: ${subscriptionOrdersData.pagination?.total || 0}`);
      
      if (subscriptionOrdersData.orders && subscriptionOrdersData.orders.length > 0) {
        subscriptionOrdersData.orders.forEach((order, index) => {
          console.log(`   ${index + 1}. 订阅记录详情:`);
          console.log(`      订单ID: ${order.orderId}`);
          console.log(`      计划: ${order.plan}`);
          console.log(`      金额: ${order.amount/100} ${order.currency}`);
          console.log(`      状态: ${order.status}`);
          console.log(`      计费周期: 每 ${order.intervalCount} ${order.interval}`);
        });
      }
    }

    console.log('\n🎉 完整订阅更新测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testCompleteSubscriptionUpdate();

