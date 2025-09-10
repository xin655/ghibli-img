const fetch = require('node-fetch');

// 测试分析API
async function testAnalyticsAPI() {
  console.log('🧪 测试分析API...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 1. 测试分析API
    console.log('📊 调用分析API...');
    const analyticsResponse = await fetch(`${baseUrl}/api/billing/analytics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      console.log('✅ 分析API调用成功');
      
      // 显示概览数据
      console.log('\n📈 概览数据:');
      console.log(`   总订阅数: ${analyticsData.data.overview.totalSubscriptions}`);
      console.log(`   活跃订阅数: ${analyticsData.data.overview.activeSubscriptions}`);
      console.log(`   总支付数: ${analyticsData.data.overview.totalPayments}`);
      console.log(`   总收入: $${analyticsData.data.overview.totalRevenue.toFixed(2)}`);
      console.log(`   平均收入: $${analyticsData.data.overview.averageRevenue.toFixed(2)}`);

      // 显示计划分布
      console.log('\n📊 计划分布:');
      Object.entries(analyticsData.data.planDistribution).forEach(([plan, stats]) => {
        console.log(`   ${plan}:`);
        console.log(`     总订阅数: ${stats.count}`);
        console.log(`     活跃订阅数: ${stats.active}`);
        console.log(`     收入: $${(stats.revenue / 100).toFixed(2)}`);
      });

      // 显示使用量分析
      console.log('\n⚡ 使用量分析:');
      console.log(`   总使用量: ${analyticsData.data.usageAnalysis.hasUnlimited ? '无限制' : analyticsData.data.usageAnalysis.totalUsage.toLocaleString()}`);
      console.log(`   使用效率: ${analyticsData.data.usageAnalysis.efficiency.toFixed(1)}%`);
      console.log(`   有无限制权限: ${analyticsData.data.usageAnalysis.hasUnlimited ? '是' : '否'}`);

      // 显示月度统计
      console.log('\n📅 月度统计:');
      analyticsData.data.monthlyStats.forEach(month => {
        console.log(`   ${month.month}: ${month.subscriptions}个订阅, $${month.revenue.toFixed(2)}收入`);
      });

      // 显示最近活动
      console.log('\n🔄 最近活动:');
      analyticsData.data.recentActivity.slice(0, 5).forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.action} - ${activity.fromPlan || 'N/A'} → ${activity.toPlan || 'N/A'} - $${activity.amount.toFixed(2)}`);
      });

      // 显示原始数据统计
      console.log('\n📋 原始数据统计:');
      console.log(`   订阅记录数: ${analyticsData.data.rawData.subscriptions.length}`);
      console.log(`   支付记录数: ${analyticsData.data.rawData.payments.length}`);

    } else {
      const errorData = await analyticsResponse.json();
      console.log('❌ 分析API调用失败:', errorData.error);
    }

    console.log('\n🎉 分析API测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testAnalyticsAPI();

