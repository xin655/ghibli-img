const fetch = require('node-fetch');

// 处理CSV中的订阅数据
async function processCsvSubscriptions() {
  console.log('🧪 处理CSV中的订阅数据...\n');

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

    // 2. 根据CSV数据创建正确的订阅记录
    const csvSubscriptions = [
      {
        id: 'sub_1S5LEAETPwR1qydLEUKepjRw',
        plan: 'basic',
        priceId: 'price_1S5KqnETPwR1qydL3HqQgTeR',
        amount: 999, // $9.99
        description: 'Basic计划订阅 (CSV数据)'
      },
      {
        id: 'sub_1S5LhfETPwR1qydLYfTnXbTH',
        plan: 'basic',
        priceId: 'price_1S5KqnETPwR1qydL3HqQgTeR',
        amount: 999, // $9.99
        description: 'Basic计划续订 (CSV数据)'
      },
      {
        id: 'sub_1S5LriETPwR1qydLRt7YQnqt',
        plan: 'pro',
        priceId: 'price_1S5Ks8ETPwR1qydL0zcZ1Wle',
        amount: 1999, // $19.99
        description: '升级到Pro计划 (CSV数据)'
      },
      {
        id: 'sub_1S5OnDETPwR1qydLRsX8hxLW',
        plan: 'enterprise',
        priceId: 'price_1S5KtNETPwR1qydLM0k0et1R',
        amount: 4999, // $49.99
        description: '升级到Enterprise计划 (CSV数据)'
      },
      {
        id: 'sub_1S5OwNETPwR1qydL8G8QXT9x',
        plan: 'basic',
        priceId: 'price_1S5KqnETPwR1qydL3HqQgTeR',
        amount: 999, // $9.99
        description: '降级到Basic计划 (CSV数据)'
      }
    ];

    console.log('\n🔄 开始处理CSV订阅数据...');

    for (let i = 0; i < csvSubscriptions.length; i++) {
      const sub = csvSubscriptions[i];
      console.log(`\n📝 处理订阅 ${i + 1}/${csvSubscriptions.length}: ${sub.description}`);
      
      // 创建webhook事件
      const webhookEvent = {
        id: `evt_csv_subscription_${i + 1}`,
        object: 'event',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: sub.id,
            object: 'subscription',
            status: 'active',
            customer: 'cus_T1NTQ2jS1V8XVZ',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            items: {
              data: [{
                price: {
                  id: sub.priceId,
                  unit_amount: sub.amount,
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

      console.log(`   订阅ID: ${sub.id}`);
      console.log(`   计划: ${sub.plan}`);
      console.log(`   价格ID: ${sub.priceId}`);
      console.log(`   金额: $${sub.amount / 100}`);

      // 发送webhook
      const webhookResponse = await fetch(`${baseUrl}/api/billing/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test_signature'
        },
        body: JSON.stringify(webhookEvent)
      });

      console.log(`   Webhook响应: ${webhookResponse.status}`);

      if (webhookResponse.ok) {
        console.log(`   ✅ ${sub.description} 处理成功`);
      } else {
        console.log(`   ❌ ${sub.description} 处理失败`);
      }

      // 等待数据保存
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 3. 检查最终状态
    console.log('\n📊 检查最终订阅状态...');
    const finalStatsResponse = await fetch(`${baseUrl}/api/billing/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (finalStatsResponse.ok) {
      const finalStats = await finalStatsResponse.json();
      console.log('✅ 最终状态:');
      console.log(`   计划: ${finalStats.subscription?.plan || 'free'}`);
      console.log(`   状态: ${finalStats.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   剩余次数: ${finalStats.usage?.freeTrialsRemaining || 0}`);
      console.log(`   Stripe客户ID: ${finalStats.subscription?.stripeCustomerId || '无'}`);
      console.log(`   Stripe订阅ID: ${finalStats.subscription?.stripeSubscriptionId || '无'}`);
    }

    // 4. 检查订阅记录
    console.log('\n🔄 检查订阅记录...');
    const subscriptionOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=subscription&page=1&limit=20`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (subscriptionOrdersResponse.ok) {
      const subscriptionOrdersData = await subscriptionOrdersResponse.json();
      console.log('✅ 订阅记录:');
      console.log(`   订阅订单数: ${subscriptionOrdersData.pagination?.total || 0}`);
      console.log(`   当前页订单数: ${subscriptionOrdersData.orders?.length || 0}`);
      
      if (subscriptionOrdersData.orders && subscriptionOrdersData.orders.length > 0) {
        console.log('   订阅记录列表:');
        subscriptionOrdersData.orders.forEach((order, index) => {
          console.log(`     ${index + 1}. 计划: ${order.plan}, 金额: $${order.amount/100} ${order.currency}, 状态: ${order.status}, 时间: ${order.createdAt}`);
        });
      }
    }

    console.log('\n🎉 CSV订阅数据处理完成！');

  } catch (error) {
    console.error('❌ 处理过程中出错:', error.message);
  }
}

processCsvSubscriptions();

