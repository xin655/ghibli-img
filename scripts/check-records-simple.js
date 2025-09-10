const fetch = require('node-fetch');

// 检查数据库记录
async function checkDatabaseRecords() {
  console.log('🔍 检查数据库记录...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 检查订阅统计
    console.log('📊 检查订阅统计...');
    const statsResponse = await fetch(`${baseUrl}/api/billing/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ 订阅统计:');
      console.log(`   当前计划: ${statsData.subscription?.plan || 'free'}`);
      console.log(`   订阅状态: ${statsData.subscription?.isActive ? '活跃' : '未激活'}`);
      console.log(`   订阅历史数量: ${statsData.recentLogs?.length || 0}`);
      console.log(`   支付历史数量: ${statsData.paymentHistory?.length || 0}`);
      
      if (statsData.recentLogs && statsData.recentLogs.length > 0) {
        console.log('   最近订阅日志:');
        statsData.recentLogs.slice(0, 3).forEach((log, index) => {
          console.log(`     ${index + 1}. ${log.action} - ${log.toPlan} - ${log.status}`);
        });
      }
      
      if (statsData.paymentHistory && statsData.paymentHistory.length > 0) {
        console.log('   最近支付记录:');
        statsData.paymentHistory.slice(0, 3).forEach((payment, index) => {
          console.log(`     ${index + 1}. ${payment.amount/100} ${payment.currency} - ${payment.status}`);
        });
      }
    } else {
      console.log('❌ 订阅统计获取失败:', statsResponse.status);
    }

    // 检查订单历史
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
      } else {
        console.log('   ⚠️ 没有订单记录');
      }
    } else {
      console.log('❌ 订单历史获取失败:', ordersResponse.status);
    }

    // 检查订阅记录
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
      console.log(`   当前页订单数: ${subscriptionOrdersData.orders?.length || 0}`);
    } else {
      console.log('❌ 订阅记录获取失败:', subscriptionOrdersResponse.status);
    }

    // 检查支付记录
    console.log('\n💳 检查支付记录...');
    const paymentOrdersResponse = await fetch(`${baseUrl}/api/billing/orders?type=payment&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (paymentOrdersResponse.ok) {
      const paymentOrdersData = await paymentOrdersResponse.json();
      console.log('✅ 支付记录:');
      console.log(`   支付订单数: ${paymentOrdersData.pagination?.total || 0}`);
      console.log(`   当前页订单数: ${paymentOrdersData.orders?.length || 0}`);
    } else {
      console.log('❌ 支付记录获取失败:', paymentOrdersResponse.status);
    }

  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  }
}

checkDatabaseRecords();

