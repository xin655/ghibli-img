const fetch = require('node-fetch');

// 使用新的管理员token测试
async function testWithFreshToken() {
  console.log('🧪 使用新的管理员token测试...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // 1. 获取新的管理员token
    console.log('🔑 获取新的管理员token...');
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
    console.log('✅ 新的管理员token获取成功');

    // 2. 测试分析API
    console.log('\n📊 测试分析API...');
    const analyticsResponse = await fetch(`${baseUrl}/api/billing/analytics`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      console.log('✅ 分析API调用成功');
      
      console.log('\n📈 概览数据:');
      console.log(`   总订阅数: ${analyticsData.data?.overview?.totalSubscriptions}`);
      console.log(`   活跃订阅数: ${analyticsData.data?.overview?.activeSubscriptions}`);
      console.log(`   总支付数: ${analyticsData.data?.overview?.totalPayments}`);
      console.log(`   总收入: $${analyticsData.data?.overview?.totalRevenue?.toFixed(2)}`);
      console.log(`   平均收入: $${analyticsData.data?.overview?.averageRevenue?.toFixed(2)}`);

      console.log('\n📊 计划分布:');
      Object.entries(analyticsData.data?.planDistribution || {}).forEach(([plan, stats]) => {
        console.log(`   ${plan}:`);
        console.log(`     总订阅数: ${stats.count}`);
        console.log(`     活跃订阅数: ${stats.active}`);
        console.log(`     收入: $${(stats.revenue / 100).toFixed(2)}`);
      });

      console.log('\n⚡ 使用量分析:');
      console.log(`   总使用量: ${analyticsData.data?.usageAnalysis?.hasUnlimited ? '无限制' : analyticsData.data?.usageAnalysis?.totalUsage}`);
      console.log(`   使用效率: ${analyticsData.data?.usageAnalysis?.efficiency?.toFixed(1)}%`);
      console.log(`   有无限制权限: ${analyticsData.data?.usageAnalysis?.hasUnlimited ? '是' : '否'}`);

      console.log('\n📅 月度统计:');
      analyticsData.data?.monthlyStats?.forEach(month => {
        console.log(`   ${month.month}: ${month.subscriptions}个订阅, $${month.revenue?.toFixed(2)}收入`);
      });

      console.log('\n🔄 最近活动:');
      analyticsData.data?.recentActivity?.slice(0, 5).forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.action} - ${activity.fromPlan || 'N/A'} → ${activity.toPlan || 'N/A'} - $${activity.amount?.toFixed(2)}`);
      });

    } else {
      console.log('❌ 分析API调用失败:', analyticsResponse.status);
      const errorData = await analyticsResponse.json().catch(() => ({}));
      console.log(`   错误信息: ${errorData.error || '未知错误'}`);
    }

    // 3. 测试订单历史API
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
      
      if (ordersData.subscriptions?.length > 0) {
        console.log('\n📊 订阅记录详情:');
        ordersData.subscriptions.forEach((sub, index) => {
          console.log(`   ${index + 1}. ${sub.plan} - $${(sub.amount / 100).toFixed(2)} - ${sub.status}`);
        });
      }
      
      if (ordersData.payments?.length > 0) {
        console.log('\n💳 支付记录详情:');
        ordersData.payments.forEach((payment, index) => {
          console.log(`   ${index + 1}. $${(payment.amount / 100).toFixed(2)} - ${payment.status} - ${payment.description}`);
        });
      }
    } else {
      console.log('❌ 订单历史API调用失败:', ordersResponse.status);
    }

    // 4. 提供恢复脚本
    console.log('\n🔧 管理员会话恢复脚本:');
    console.log('在浏览器控制台中运行以下脚本:');
    console.log(`
// 恢复管理员会话
localStorage.clear();
localStorage.setItem('jwt', '${adminToken}');
localStorage.setItem('user', '${JSON.stringify(adminData.user)}');
localStorage.setItem('userState', '${JSON.stringify(adminData.userState)}');
console.log('✅ 管理员会话已恢复');
console.log('用户信息:', JSON.parse(localStorage.getItem('user')));
console.log('用户状态:', JSON.parse(localStorage.getItem('userState')));
window.location.reload();
    `);

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testWithFreshToken();

