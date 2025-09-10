const fetch = require('node-fetch');

// 检查订阅记录详情
async function checkSubscriptionRecordDetails() {
  console.log('🔍 检查订阅记录详情...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 检查订阅记录
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
          console.log(`      创建时间: ${order.createdAt}`);
          console.log(`      到期时间: ${order.currentPeriodEnd}`);
          console.log(`      计费周期: 每 ${order.intervalCount} ${order.interval}`);
          if (order.metadata) {
            console.log(`      元数据: ${JSON.stringify(order.metadata)}`);
          }
        });
      }
    }

    // 检查支付记录
    const paymentOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=payment&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (paymentOrdersResponse.ok) {
      const paymentOrdersData = await paymentOrdersResponse.json();
      console.log('\n✅ 支付记录详情:');
      console.log(`   支付订单数: ${paymentOrdersData.pagination?.total || 0}`);
      
      if (paymentOrdersData.orders && paymentOrdersData.orders.length > 0) {
        paymentOrdersData.orders.forEach((order, index) => {
          console.log(`   ${index + 1}. 支付记录详情:`);
          console.log(`      订单ID: ${order.orderId}`);
          console.log(`      金额: ${order.amount/100} ${order.currency}`);
          console.log(`      状态: ${order.status}`);
          console.log(`      创建时间: ${order.createdAt}`);
          console.log(`      支付时间: ${order.paidAt}`);
          console.log(`      描述: ${order.description}`);
        });
      }
    }

    // 检查用户状态
    const statsResponse = await fetch(`${baseUrl}/api/billing/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('\n✅ 用户状态详情:');
      console.log(`   当前计划: ${statsData.subscription?.plan || 'free'}`);
      console.log(`   订阅状态: ${statsData.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   剩余次数: ${statsData.usage?.freeTrialsRemaining || 0}`);
      console.log(`   总转换次数: ${statsData.usage?.totalTransformations || 0}`);
      console.log(`   Stripe客户ID: ${statsData.subscription?.stripeCustomerId || '无'}`);
      console.log(`   Stripe订阅ID: ${statsData.subscription?.stripeSubscriptionId || '无'}`);
    }

  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  }
}

checkSubscriptionRecordDetails();

