const fetch = require('node-fetch');

// 测试订阅降级
async function testSubscriptionDowngrade() {
  console.log('🧪 测试订阅降级功能...\n');

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
      console.log(`   总转换次数: ${currentStats.usage?.totalTransformations || 0}`);
    }

    // 2. 模拟订阅降级 (从enterprise到basic)
    console.log('\n🔄 模拟订阅降级 (Enterprise -> Basic)...');
    
    const downgradeEvent = {
      id: 'evt_test_subscription_downgrade',
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_basic_456',
          object: 'subscription',
          status: 'active',
          customer: 'cus_test_enterprise_123',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          items: {
            data: [{
              price: {
                id: 'price_basic_test',
                unit_amount: 999, // $9.99
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
      body: JSON.stringify(downgradeEvent)
    });

    console.log(`📥 Webhook响应状态: ${webhookResponse.status}`);
    const webhookResponseText = await webhookResponse.text();
    console.log(`📥 Webhook响应内容: ${webhookResponseText}`);

    if (webhookResponse.ok) {
      console.log('✅ 订阅降级webhook处理成功');
    } else {
      console.log('❌ 订阅降级webhook处理失败');
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
      console.log(`   剩余次数: ${newStats.subscription?.plan === 'enterprise' ? '无限制' : newStats.usage?.freeTrialsRemaining || 0}`);
      console.log(`   总转换次数: ${newStats.usage?.totalTransformations || 0}`);
      console.log(`   订阅历史数量: ${newStats.recentLogs?.length || 0}`);
      console.log(`   支付历史数量: ${newStats.paymentHistory?.length || 0}`);
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

    // 5. 创建新的支付记录
    console.log('\n💳 创建新的支付记录...');
    const newPaymentResponse = await fetch(`${baseUrl}/api/billing/create-test-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (newPaymentResponse.ok) {
      const newPaymentData = await newPaymentResponse.json();
      console.log('✅ 新支付记录创建成功');
    }

    // 等待数据保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. 最终检查
    console.log('\n🔍 最终检查...');
    const finalOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=all&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (finalOrdersResponse.ok) {
      const finalOrdersData = await finalOrdersResponse.json();
      console.log('✅ 最终订单历史:');
      console.log(`   总订单数: ${finalOrdersData.pagination?.total || 0}`);
      console.log(`   当前页订单数: ${finalOrdersData.orders?.length || 0}`);
    }

    console.log('\n🎉 订阅降级测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testSubscriptionDowngrade();

