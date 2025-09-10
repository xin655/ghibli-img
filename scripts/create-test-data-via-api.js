const fetch = require('node-fetch');

// 通过API创建测试数据
async function createTestDataViaAPI() {
  console.log('🔧 通过API创建测试订阅数据...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 创建测试数据
    console.log('📤 调用创建测试数据API...');
    const createResponse = await fetch(`${baseUrl}/api/billing/create-test-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ 测试数据创建成功:');
      console.log(`   订阅记录: ${createData.data?.subscriptionRecord}`);
      console.log(`   支付记录: ${createData.data?.paymentRecord}`);
    } else {
      const errorData = await createResponse.json();
      console.log('❌ 测试数据创建失败:', errorData.error);
      return;
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

    // 检查订阅记录
    const subscriptionOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=subscription&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (subscriptionOrdersResponse.ok) {
      const subscriptionOrdersData = await subscriptionOrdersResponse.json();
      console.log('\n✅ 订阅记录:');
      console.log(`   订阅订单数: ${subscriptionOrdersData.pagination?.total || 0}`);
      console.log(`   当前页订单数: ${subscriptionOrdersData.orders?.length || 0}`);
    }

    // 检查支付记录
    const paymentOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=payment&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (paymentOrdersResponse.ok) {
      const paymentOrdersData = await paymentOrdersResponse.json();
      console.log('\n✅ 支付记录:');
      console.log(`   支付订单数: ${paymentOrdersData.pagination?.total || 0}`);
      console.log(`   当前页订单数: ${paymentOrdersData.orders?.length || 0}`);
    }

    console.log('\n🎉 测试数据创建完成！');
    console.log('\n📝 现在可以访问以下页面查看数据:');
    console.log('   1. http://localhost:3000/orders - 查看订单历史');
    console.log('   2. http://localhost:3000/subscription - 查看订阅管理');

  } catch (error) {
    console.error('❌ 创建过程中出错:', error.message);
  }
}

createTestDataViaAPI();

