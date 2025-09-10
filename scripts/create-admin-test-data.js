const fetch = require('node-fetch');

// 为管理员用户创建完整的测试数据
async function createAdminTestData() {
  console.log('🔧 为管理员用户创建完整的测试数据...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // 1. 首先获取管理员token
    console.log('🔑 获取管理员token...');
    const adminLoginResponse = await fetch(`${baseUrl}/api/auth/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'admin',
        email: 'admin@example.com'
      })
    });

    if (!adminLoginResponse.ok) {
      console.log('❌ 管理员登录失败');
      return;
    }

    const adminData = await adminLoginResponse.json();
    const adminToken = adminData.token;
    console.log('✅ 管理员token获取成功');

    // 2. 创建测试订阅数据
    console.log('\n📊 创建测试订阅数据...');
    const createTestDataResponse = await fetch(`${baseUrl}/api/billing/create-test-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (createTestDataResponse.ok) {
      const testDataResult = await createTestDataResponse.json();
      console.log('✅ 测试数据创建成功');
      console.log(`   订阅ID: ${testDataResult.subscriptionId}`);
      console.log(`   支付ID: ${testDataResult.paymentIntentId}`);
    } else {
      console.log('❌ 测试数据创建失败:', createTestDataResponse.status);
    }

    // 3. 创建多个订阅记录
    console.log('\n🔄 创建多个订阅记录...');
    const subscriptions = [
      {
        plan: 'basic',
        amount: 999,
        description: 'Basic Plan Subscription',
        status: 'active'
      },
      {
        plan: 'pro',
        amount: 1999,
        description: 'Pro Plan Subscription',
        status: 'active'
      },
      {
        plan: 'enterprise',
        amount: 4999,
        description: 'Enterprise Plan Subscription',
        status: 'active'
      }
    ];

    for (const sub of subscriptions) {
      const subscriptionResponse = await fetch(`${baseUrl}/api/billing/create-test-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: sub.plan,
          amount: sub.amount,
          description: sub.description,
          status: sub.status
        })
      });

      if (subscriptionResponse.ok) {
        console.log(`✅ ${sub.plan} 订阅记录创建成功`);
      } else {
        console.log(`❌ ${sub.plan} 订阅记录创建失败`);
      }
    }

    // 4. 测试分析API
    console.log('\n📈 测试分析API...');
    const analyticsResponse = await fetch(`${baseUrl}/api/billing/analytics`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      console.log('✅ 分析API调用成功');
      console.log(`   总订阅数: ${analyticsData.data?.overview?.totalSubscriptions}`);
      console.log(`   活跃订阅数: ${analyticsData.data?.overview?.activeSubscriptions}`);
      console.log(`   总收入: $${analyticsData.data?.overview?.totalRevenue?.toFixed(2)}`);
      console.log(`   月度统计: ${analyticsData.data?.monthlyStats?.length || 0} 个月份`);
    } else {
      console.log('❌ 分析API调用失败:', analyticsResponse.status);
    }

    // 5. 测试订单历史API
    console.log('\n📋 测试订单历史API...');
    const ordersResponse = await fetch(`${baseUrl}/api/billing/orders`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log('✅ 订单历史API调用成功');
      console.log(`   订阅记录数: ${ordersData.subscriptions?.length || 0}`);
      console.log(`   支付记录数: ${ordersData.payments?.length || 0}`);
    } else {
      console.log('❌ 订单历史API调用失败:', ordersResponse.status);
    }

    // 6. 提供数据恢复脚本
    console.log('\n🔧 数据恢复脚本:');
    console.log('在浏览器控制台中运行以下脚本以恢复管理员会话:');
    console.log(`
// 恢复管理员会话
localStorage.clear();
localStorage.setItem('jwt', '${adminToken}');
localStorage.setItem('user', '${JSON.stringify(adminData.user)}');
localStorage.setItem('userState', '${JSON.stringify(adminData.userState)}');
console.log('✅ 管理员会话已恢复');
window.location.reload();
    `);

  } catch (error) {
    console.error('❌ 创建测试数据过程中出错:', error.message);
  }
}

createAdminTestData();

