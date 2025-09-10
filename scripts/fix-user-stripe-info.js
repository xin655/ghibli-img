const fetch = require('node-fetch');

// 修复用户Stripe信息
async function fixUserStripeInfo() {
  console.log('🔧 修复用户Stripe信息...\n');

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
      console.log(`   Stripe客户ID: ${currentStats.subscription?.stripeCustomerId || '无'}`);
      console.log(`   Stripe订阅ID: ${currentStats.subscription?.stripeSubscriptionId || '无'}`);
    }

    // 2. 发送一个完整的订阅更新事件，确保Stripe信息正确保存
    console.log('\n🔄 发送完整的订阅更新事件...');
    
    const completeSubscriptionEvent = {
      id: 'evt_fix_complete_subscription',
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1S5OwNETPwR1qydL8G8QXT9x', // 最新的订阅ID
          object: 'subscription',
          status: 'active',
          customer: 'cus_T1NTQ2jS1V8XVZ', // 客户ID
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

    console.log('📤 发送完整订阅更新...');
    console.log(`   订阅ID: ${completeSubscriptionEvent.data.object.id}`);
    console.log(`   客户ID: ${completeSubscriptionEvent.data.object.customer}`);
    console.log(`   计划: Basic`);
    console.log(`   价格ID: ${completeSubscriptionEvent.data.object.items.data[0].price.id}`);
    console.log(`   金额: $${completeSubscriptionEvent.data.object.items.data[0].price.unit_amount / 100}`);

    const webhookResponse = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(completeSubscriptionEvent)
    });

    console.log(`📥 Webhook响应: ${webhookResponse.status}`);

    if (webhookResponse.ok) {
      console.log('✅ 完整订阅更新成功');
    } else {
      console.log('❌ 完整订阅更新失败');
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
      console.log(`   当前周期结束: ${updatedStats.subscription?.currentPeriodEnd || '无'}`);
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
      console.log(`   Stripe客户ID: ${usageData.subscription?.stripeCustomerId || '无'}`);
      console.log(`   Stripe订阅ID: ${usageData.subscription?.stripeSubscriptionId || '无'}`);
    }

    // 5. 最终验证
    console.log('\n🎯 最终验证:');
    if (updatedStatsResponse.ok) {
      const finalStats = await updatedStatsResponse.json();
      const hasStripeInfo = finalStats.subscription?.stripeCustomerId && finalStats.subscription?.stripeSubscriptionId;
      
      if (hasStripeInfo) {
        console.log('✅ Stripe信息修复成功！');
        console.log(`   - 客户ID: ${finalStats.subscription.stripeCustomerId}`);
        console.log(`   - 订阅ID: ${finalStats.subscription.stripeSubscriptionId}`);
        console.log(`   - 计划: ${finalStats.subscription.plan}`);
        console.log(`   - 剩余次数: ${finalStats.usage?.freeTrialsRemaining}`);
      } else {
        console.log('❌ Stripe信息修复失败');
        console.log('   需要进一步检查webhook处理逻辑');
      }
    }

    console.log('\n🎉 用户Stripe信息修复完成！');

  } catch (error) {
    console.error('❌ 修复过程中出错:', error.message);
  }
}

fixUserStripeInfo();

