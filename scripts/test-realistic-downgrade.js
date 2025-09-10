const fetch = require('node-fetch');

// 测试真实的订阅降级场景
async function testRealisticDowngrade() {
  console.log('🧪 测试真实订阅降级场景...\n');

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
      console.log(`   订阅ID: ${currentStats.subscription?.stripeSubscriptionId || '无'}`);
    }

    // 2. 模拟真实的订阅降级 (使用相同的订阅ID)
    console.log('\n🔄 模拟真实订阅降级 (使用相同订阅ID)...');
    
    const realisticDowngradeEvent = {
      id: 'evt_test_realistic_downgrade',
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
                id: 'price_basic_test', // 新的价格ID (basic)
                unit_amount: 999, // $9.99 (basic价格)
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

    const webhookResponse = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(realisticDowngradeEvent)
    });

    console.log(`📥 Webhook响应状态: ${webhookResponse.status}`);
    const webhookResponseText = await webhookResponse.text();
    console.log(`📥 Webhook响应内容: ${webhookResponseText}`);

    if (webhookResponse.ok) {
      console.log('✅ 真实订阅降级webhook处理成功');
    } else {
      console.log('❌ 真实订阅降级webhook处理失败');
    }

    // 等待数据保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 检查降级后的状态
    console.log('\n📊 检查降级后的状态...');
    const newStatsResponse = await fetch(`${baseUrl}/api/billing/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (newStatsResponse.ok) {
      const newStats = await newStatsResponse.json();
      console.log('✅ 降级后状态:');
      console.log(`   计划: ${newStats.subscription?.plan || 'free'}`);
      console.log(`   状态: ${newStats.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   剩余次数: ${newStats.usage?.freeTrialsRemaining || 0}`);
      console.log(`   订阅ID: ${newStats.subscription?.stripeSubscriptionId || '无'}`);
    }

    // 4. 检查订单历史
    console.log('\n📋 检查订单历史...');
    const ordersResponse = await fetch(`${baseUrl}/api/billing/orders?type=all&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log('✅ 订单历史:');
      console.log(`   总订单数: ${ordersData.pagination?.total || 0}`);
      console.log(`   当前页订单数: ${ordersData.orders?.length || 0}`);
      
      if (ordersData.orders && ordersData.orders.length > 0) {
        console.log('   订单列表:');
        ordersData.orders.forEach((order, index) => {
          console.log(`     ${index + 1}. ${order.type} - ${order.status} - ${order.amount/100} ${order.currency}`);
        });
      }
    }

    // 5. 检查订阅记录详情
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
          console.log(`   ${index + 1}. 计划: ${order.plan}, 金额: ${order.amount/100} ${order.currency}, 状态: ${order.status}`);
        });
      }
    }

    console.log('\n🎉 真实订阅降级测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testRealisticDowngrade();

