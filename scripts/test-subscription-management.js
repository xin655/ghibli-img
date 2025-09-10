const fetch = require('node-fetch');

// 测试订阅管理功能
async function testSubscriptionManagement() {
  console.log('🧪 测试订阅管理功能...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 测试获取订阅统计
    console.log('📊 测试获取订阅统计...');
    const statsResponse = await fetch(`${baseUrl}/api/billing/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ 订阅统计获取成功:');
      console.log(`   当前计划: ${statsData.subscription?.plan || 'free'}`);
      console.log(`   订阅状态: ${statsData.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   剩余次数: ${statsData.usage?.freeTrialsRemaining || 0}`);
      console.log(`   总转换次数: ${statsData.usage?.totalTransformations || 0}`);
    } else {
      console.log('❌ 订阅统计获取失败:', statsResponse.status);
    }

    // 测试获取订单历史
    console.log('\n📋 测试获取订单历史...');
    const ordersResponse = await fetch(`${baseUrl}/api/billing/orders?type=all&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log('✅ 订单历史获取成功:');
      console.log(`   总订单数: ${ordersData.pagination?.total || 0}`);
      console.log(`   当前页订单数: ${ordersData.orders?.length || 0}`);
      
      if (ordersData.orders && ordersData.orders.length > 0) {
        console.log('   最近订单:');
        ordersData.orders.slice(0, 3).forEach((order, index) => {
          console.log(`     ${index + 1}. ${order.type} - ${order.status} - ${order.amount/100} ${order.currency?.toUpperCase()}`);
        });
      }
    } else {
      console.log('❌ 订单历史获取失败:', ordersResponse.status);
    }

    // 测试获取使用量统计
    console.log('\n📈 测试获取使用量统计...');
    const usageResponse = await fetch(`${baseUrl}/api/billing/usage`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (usageResponse.ok) {
      const usageData = await usageResponse.json();
      console.log('✅ 使用量统计获取成功:');
      console.log(`   剩余次数: ${usageData.usage?.freeTrialsRemaining || 0}`);
      console.log(`   总转换次数: ${usageData.usage?.totalTransformations || 0}`);
      console.log(`   使用率: ${usageData.usage?.usagePercentage || 0}%`);
    } else {
      console.log('❌ 使用量统计获取失败:', usageResponse.status);
    }

    console.log('\n🎉 订阅管理功能测试完成！');
    console.log('\n📝 功能说明:');
    console.log('   1. 访问 /subscription 查看订阅管理页面');
    console.log('   2. 访问 /orders 查看订单历史页面');
    console.log('   3. 在用户菜单中可以快速访问这些功能');
    console.log('   4. 订阅用户会看到绿色的订阅状态指示器');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

// 运行测试
testSubscriptionManagement();

