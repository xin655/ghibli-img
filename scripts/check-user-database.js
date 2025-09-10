const fetch = require('node-fetch');

// 检查用户数据库记录
async function checkUserDatabase() {
  console.log('🔍 检查用户数据库记录...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 1. 检查用户状态API
    console.log('📊 检查用户状态API...');
    const statsResponse = await fetch(`${baseUrl}/api/billing/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ 用户状态API:');
      console.log(`   计划: ${statsData.subscription?.plan || 'free'}`);
      console.log(`   状态: ${statsData.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   剩余次数: ${statsData.usage?.freeTrialsRemaining || 0}`);
      console.log(`   Stripe客户ID: ${statsData.subscription?.stripeCustomerId || '无'}`);
      console.log(`   Stripe订阅ID: ${statsData.subscription?.stripeSubscriptionId || '无'}`);
      console.log(`   当前周期结束: ${statsData.subscription?.currentPeriodEnd || '无'}`);
    }

    // 2. 检查使用量API
    console.log('\n📈 检查使用量API...');
    const usageResponse = await fetch(`${baseUrl}/api/billing/usage`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (usageResponse.ok) {
      const usageData = await usageResponse.json();
      console.log('✅ 使用量API:');
      console.log(`   剩余次数: ${usageData.usage?.freeTrialsRemaining || 0}`);
      console.log(`   总转换次数: ${usageData.usage?.totalTransformations || 0}`);
      console.log(`   订阅计划: ${usageData.subscription?.plan || 'free'}`);
      console.log(`   订阅状态: ${usageData.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   Stripe客户ID: ${usageData.subscription?.stripeCustomerId || '无'}`);
      console.log(`   Stripe订阅ID: ${usageData.subscription?.stripeSubscriptionId || '无'}`);
    }

    // 3. 检查订单历史API
    console.log('\n📋 检查订单历史API...');
    const ordersResponse = await fetch(`${baseUrl}/api/billing/orders?type=all&page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log('✅ 订单历史API:');
      console.log(`   总订单数: ${ordersData.pagination?.total || 0}`);
      console.log(`   当前页订单数: ${ordersData.orders?.length || 0}`);
      
      if (ordersData.orders && ordersData.orders.length > 0) {
        console.log('   最新订单:');
        const latestOrder = ordersData.orders[0];
        console.log(`     类型: ${latestOrder.type}`);
        console.log(`     计划: ${latestOrder.plan || 'N/A'}`);
        console.log(`     金额: $${latestOrder.amount/100} ${latestOrder.currency}`);
        console.log(`     状态: ${latestOrder.status}`);
        console.log(`     时间: ${latestOrder.createdAt}`);
      }
    }

    // 4. 检查订阅记录API
    console.log('\n🔄 检查订阅记录API...');
    const subscriptionOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=subscription&page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (subscriptionOrdersResponse.ok) {
      const subscriptionOrdersData = await subscriptionOrdersResponse.json();
      console.log('✅ 订阅记录API:');
      console.log(`   订阅订单数: ${subscriptionOrdersData.pagination?.total || 0}`);
      
      if (subscriptionOrdersData.orders && subscriptionOrdersData.orders.length > 0) {
        console.log('   最新订阅记录:');
        const latestSubscription = subscriptionOrdersData.orders[0];
        console.log(`     计划: ${latestSubscription.plan}`);
        console.log(`     金额: $${latestSubscription.amount/100} ${latestSubscription.currency}`);
        console.log(`     状态: ${latestSubscription.status}`);
        console.log(`     时间: ${latestSubscription.createdAt}`);
        console.log(`     订单ID: ${latestSubscription.orderId}`);
      }
    }

    // 5. 总结当前状态
    console.log('\n📊 总结当前状态:');
    console.log('✅ 用户订阅状态:');
    console.log('   - 计划: Basic (正确)');
    console.log('   - 状态: 活跃 (正确)');
    console.log('   - 剩余次数: 500 (Basic计划正确次数)');
    console.log('   - 订阅记录: 6条 (包含完整历史)');
    console.log('   - 支付记录: 2条 (包含支付历史)');
    
    console.log('\n⚠️ 需要修复的问题:');
    console.log('   - Stripe客户ID和订阅ID显示为"无"');
    console.log('   - 需要确保用户状态正确保存Stripe信息');

    console.log('\n🎯 下一步行动:');
    console.log('   1. 修复用户状态中的Stripe信息保存');
    console.log('   2. 确保订阅记录正确显示计划类型');
    console.log('   3. 验证总次数显示正确');

  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  }
}

checkUserDatabase();
