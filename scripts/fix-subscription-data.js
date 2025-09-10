const fetch = require('node-fetch');

// 修复订阅数据
async function fixSubscriptionData() {
  console.log('🔧 修复订阅数据...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 1. 检查当前状态
    console.log('📊 检查当前状态...');
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

    // 2. 根据CSV数据，最新的订阅应该是Basic计划 ($9.99)
    // 但我们需要确保用户状态正确反映这个信息
    console.log('\n🔄 更新用户订阅状态...');
    
    // 模拟最新的订阅更新 (Basic计划)
    const latestSubscriptionEvent = {
      id: 'evt_fix_latest_subscription',
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1S5OwNETPwR1qydL8G8QXT9x', // 最新的订阅ID
          object: 'subscription',
          status: 'active',
          customer: 'cus_T1NTQ2jS1V8XVZ',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          items: {
            data: [{
              price: {
                id: 'price_1S5KqnETPwR1qydL3HqQgTeR', // Basic计划价格ID
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

    console.log('📤 发送最新订阅状态更新...');
    console.log(`   订阅ID: ${latestSubscriptionEvent.data.object.id}`);
    console.log(`   计划: Basic`);
    console.log(`   价格ID: ${latestSubscriptionEvent.data.object.items.data[0].price.id}`);
    console.log(`   金额: $${latestSubscriptionEvent.data.object.items.data[0].price.unit_amount / 100}`);

    const webhookResponse = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(latestSubscriptionEvent)
    });

    console.log(`📥 Webhook响应: ${webhookResponse.status}`);

    if (webhookResponse.ok) {
      console.log('✅ 最新订阅状态更新成功');
    } else {
      console.log('❌ 最新订阅状态更新失败');
    }

    // 等待数据保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 检查更新后的状态
    console.log('\n📊 检查更新后的状态...');
    const updatedStatsResponse = await fetch(`${baseUrl}/api/billing/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (updatedStatsResponse.ok) {
      const updatedStats = await updatedStatsResponse.json();
      console.log('✅ 更新后状态:');
      console.log(`   计划: ${updatedStats.subscription?.plan || 'free'}`);
      console.log(`   状态: ${updatedStats.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   剩余次数: ${updatedStats.usage?.freeTrialsRemaining || 0}`);
      console.log(`   Stripe客户ID: ${updatedStats.subscription?.stripeCustomerId || '无'}`);
      console.log(`   Stripe订阅ID: ${updatedStats.subscription?.stripeSubscriptionId || '无'}`);
    }

    // 4. 检查使用量统计
    console.log('\n📈 检查使用量统计...');
    const usageResponse = await fetch(`${baseUrl}/api/billing/usage`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (usageResponse.ok) {
      const usageData = await usageResponse.json();
      console.log('✅ 使用量统计:');
      console.log(`   剩余次数: ${usageData.usage?.freeTrialsRemaining || 0}`);
      console.log(`   总转换次数: ${usageData.usage?.totalTransformations || 0}`);
      console.log(`   订阅计划: ${usageData.subscription?.plan || 'free'}`);
      console.log(`   订阅状态: ${usageData.subscription?.isActive ? '活跃' : '未激活'}`);
    }

    // 5. 检查订阅记录
    console.log('\n🔄 检查订阅记录...');
    const subscriptionOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=subscription&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (subscriptionOrdersResponse.ok) {
      const subscriptionOrdersData = await subscriptionOrdersResponse.json();
      console.log('✅ 订阅记录:');
      console.log(`   订阅订单数: ${subscriptionOrdersData.pagination?.total || 0}`);
      
      if (subscriptionOrdersData.orders && subscriptionOrdersData.orders.length > 0) {
        console.log('   最新订阅记录:');
        const latestOrder = subscriptionOrdersData.orders[0];
        console.log(`     计划: ${latestOrder.plan}`);
        console.log(`     金额: $${latestOrder.amount/100} ${latestOrder.currency}`);
        console.log(`     状态: ${latestOrder.status}`);
        console.log(`     时间: ${latestOrder.createdAt}`);
      }
    }

    console.log('\n🎉 订阅数据修复完成！');

  } catch (error) {
    console.error('❌ 修复过程中出错:', error.message);
  }
}

fixSubscriptionData();

