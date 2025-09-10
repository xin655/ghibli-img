const fetch = require('node-fetch');

// 创建测试订阅记录
async function createTestSubscriptionRecords() {
  console.log('🔧 创建测试订阅记录...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 模拟checkout.session.completed事件
    console.log('📤 模拟checkout.session.completed事件...');
    
    const mockEvent = {
      id: 'evt_test_checkout_completed',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_enterprise_subscription',
          object: 'checkout.session',
          subscription: 'sub_test_enterprise_123',
          customer: 'cus_test_enterprise_123',
          metadata: {
            appUserId: '68bfc35e2c9a8cc9d8d876f6',
            plan: 'enterprise'
          }
        }
      }
    };

    const webhookResponse = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature' // 在开发环境中可能会跳过验证
      },
      body: JSON.stringify(mockEvent)
    });

    console.log(`📥 Webhook响应状态: ${webhookResponse.status}`);
    const webhookResponseText = await webhookResponse.text();
    console.log(`📥 Webhook响应内容: ${webhookResponseText}`);

    if (webhookResponse.ok) {
      console.log('✅ Webhook处理成功');
    } else {
      console.log('❌ Webhook处理失败');
    }

    // 等待一下让数据保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 检查结果
    console.log('\n🔍 检查创建结果...');
    
    // 检查订单历史
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

    // 检查订阅统计
    const statsResponse = await fetch(`${baseUrl}/api/billing/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('\n✅ 订阅统计:');
      console.log(`   订阅历史数量: ${statsData.recentLogs?.length || 0}`);
      console.log(`   支付历史数量: ${statsData.paymentHistory?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ 创建过程中出错:', error.message);
  }
}

createTestSubscriptionRecords();

