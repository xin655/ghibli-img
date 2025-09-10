const fetch = require('node-fetch');

// 手动触发累积使用次数计算
async function triggerCumulativeCalculation() {
  console.log('🔧 手动触发累积使用次数计算...\n');

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

    // 2. 检查所有活跃订阅
    console.log('\n📋 检查所有活跃订阅...');
    const subscriptionOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=subscription&page=1&limit=20`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (subscriptionOrdersResponse.ok) {
      const subscriptionOrdersData = await subscriptionOrdersResponse.json();
      console.log('✅ 活跃订阅列表:');
      console.log(`   订阅订单数: ${subscriptionOrdersData.pagination?.total || 0}`);
      
      if (subscriptionOrdersData.orders && subscriptionOrdersData.orders.length > 0) {
        let basicCount = 0;
        let proCount = 0;
        let enterpriseCount = 0;
        
        subscriptionOrdersData.orders.forEach((order, index) => {
          console.log(`     ${index + 1}. 计划: ${order.plan}, 金额: $${order.amount/100} ${order.currency}, 状态: ${order.status}`);
          
          if (order.plan === 'basic') basicCount++;
          else if (order.plan === 'pro') proCount++;
          else if (order.plan === 'enterprise') enterpriseCount++;
        });
        
        console.log('\n📊 订阅统计:');
        console.log(`   Basic订阅: ${basicCount}个 (${basicCount * 500}次)`);
        console.log(`   Pro订阅: ${proCount}个 (${proCount * 2000}次)`);
        console.log(`   Enterprise订阅: ${enterpriseCount}个 (无限制)`);
        
        const totalBasic = basicCount * 500;
        const totalPro = proCount * 2000;
        const hasEnterprise = enterpriseCount > 0;
        
        console.log('\n🎯 预期累积结果:');
        if (hasEnterprise) {
          console.log(`   最终结果: 无限制 (因为有${enterpriseCount}个Enterprise订阅)`);
        } else {
          console.log(`   最终结果: ${totalBasic + totalPro}次 (Basic: ${totalBasic} + Pro: ${totalPro})`);
        }
      }
    }

    // 3. 发送一个订阅更新事件来触发累积计算
    console.log('\n🔄 发送订阅更新事件触发累积计算...');
    
    const triggerEvent = {
      id: 'evt_trigger_cumulative',
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_enterprise_price', // 使用Enterprise订阅ID
          object: 'subscription',
          status: 'active',
          customer: 'cus_T1NTQ2jS1V8XVZ',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          items: {
            data: [{
              price: {
                id: 'price_1S5KtNETPwR1qydLM0k0et1R', // Enterprise价格ID
                unit_amount: 4999, // $49.99
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
      body: JSON.stringify(triggerEvent)
    });

    console.log(`📥 Webhook响应: ${webhookResponse.status}`);

    if (webhookResponse.ok) {
      console.log('✅ 累积计算触发成功');
    } else {
      console.log('❌ 累积计算触发失败');
    }

    // 等待数据保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. 检查更新后的状态
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
      console.log(`   剩余次数: ${updatedStats.usage?.freeTrialsRemaining === -1 ? '无限制' : updatedStats.usage?.freeTrialsRemaining || 0}`);
    }

    // 5. 检查使用量统计
    console.log('\n📈 检查使用量统计...');
    const usageResponse = await fetch(`${baseUrl}/api/billing/usage`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (usageResponse.ok) {
      const usageData = await usageResponse.json();
      console.log('✅ 使用量统计:');
      console.log(`   剩余次数: ${usageData.usage?.freeTrialsRemaining === -1 ? '无限制' : usageData.usage?.freeTrialsRemaining || 0}`);
      console.log(`   总转换次数: ${usageData.usage?.totalTransformations || 0}`);
      console.log(`   订阅计划: ${usageData.subscription?.plan || 'free'}`);
      console.log(`   订阅状态: ${usageData.subscription?.isActive ? '活跃' : '未激活'}`);
    }

    console.log('\n🎉 累积使用次数计算完成！');

  } catch (error) {
    console.error('❌ 计算过程中出错:', error.message);
  }
}

triggerCumulativeCalculation();

