const fetch = require('node-fetch');

// 测试管理员权限分析功能
async function testAdminAnalytics() {
  console.log('🧪 测试管理员权限分析功能...\n');

  const baseUrl = 'http://localhost:3000';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    // 1. 测试用户状态API（检查管理员权限）
    console.log('👤 检查用户状态和管理员权限...');
    const userStatusResponse = await fetch(`${baseUrl}/api/billing/usage`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (userStatusResponse.ok) {
      const userStatusData = await userStatusResponse.json();
      console.log('✅ 用户状态API调用成功');
      console.log(`   用户邮箱: ${userStatusData.user?.email}`);
      console.log(`   用户姓名: ${userStatusData.user?.name}`);
      console.log(`   订阅计划: ${userStatusData.subscription?.plan}`);
      console.log(`   订阅状态: ${userStatusData.subscription?.isActive ? '活跃' : '非活跃'}`);
    } else {
      console.log('❌ 用户状态API调用失败:', userStatusResponse.status);
    }

    // 2. 测试分析API（管理员权限）
    console.log('\n📊 测试分析API（管理员权限）...');
    const analyticsResponse = await fetch(`${baseUrl}/api/billing/analytics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      console.log('✅ 分析API调用成功 - 管理员权限验证通过');
      
      // 显示概览数据
      console.log('\n📈 概览数据:');
      console.log(`   总订阅数: ${analyticsData.data.overview.totalSubscriptions}`);
      console.log(`   活跃订阅数: ${analyticsData.data.overview.activeSubscriptions}`);
      console.log(`   总收入: $${analyticsData.data.overview.totalRevenue.toFixed(2)}`);

    } else if (analyticsResponse.status === 403) {
      const errorData = await analyticsResponse.json();
      console.log('❌ 分析API访问被拒绝 - 无管理员权限');
      console.log(`   错误信息: ${errorData.error}`);
      console.log('   这是预期的行为，因为当前用户不是管理员');
    } else {
      const errorData = await analyticsResponse.json();
      console.log('❌ 分析API调用失败:', errorData.error);
    }

    // 3. 测试非管理员用户访问
    console.log('\n🔒 测试非管理员用户访问...');
    const nonAdminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6Im5vbmFkbWluQGV4YW1wbGUuY29tIiwiZ29vZ2xlSWQiOiJ0ZXN0LWdvb2dsZS1pZC0xMjMiLCJpYXQiOjE3NTczOTc5NjQsImV4cCI6MTc1ODAwMjc2NH0.invalid-token';
    
    const nonAdminResponse = await fetch(`${baseUrl}/api/billing/analytics`, {
      headers: {
        'Authorization': `Bearer ${nonAdminToken}`,
      },
    });

    if (nonAdminResponse.status === 403) {
      console.log('✅ 非管理员用户访问被正确拒绝');
    } else {
      console.log('⚠️ 非管理员用户访问未被拒绝，可能存在安全问题');
    }

    console.log('\n🎉 管理员权限测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testAdminAnalytics();

