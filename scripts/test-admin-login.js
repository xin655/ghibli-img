const fetch = require('node-fetch');

// 测试管理员登录功能
async function testAdminLogin() {
  console.log('🧪 测试管理员登录功能...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // 1. 测试管理员登录API
    console.log('🔑 测试管理员登录API...');
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

    if (adminLoginResponse.ok) {
      const adminData = await adminLoginResponse.json();
      console.log('✅ 管理员登录API调用成功');
      console.log(`   用户邮箱: ${adminData.user?.email}`);
      console.log(`   用户姓名: ${adminData.user?.name}`);
      console.log(`   订阅计划: ${adminData.userState?.subscriptionPlan}`);
      console.log(`   管理员权限: ${adminData.userState?.isAdmin ? '是' : '否'}`);
      console.log(`   使用次数: ${adminData.userState?.freeTrialsRemaining === -1 ? '无限制' : adminData.userState?.freeTrialsRemaining}`);
      console.log(`   JWT Token: ${adminData.token ? '已生成' : '未生成'}`);

      // 2. 使用管理员token测试分析API
      console.log('\n📊 使用管理员token测试分析API...');
      const analyticsResponse = await fetch(`${baseUrl}/api/billing/analytics`, {
        headers: {
          'Authorization': `Bearer ${adminData.token}`,
        },
      });

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        console.log('✅ 管理员可以访问数据分析API');
        console.log(`   总订阅数: ${analyticsData.data?.overview?.totalSubscriptions}`);
        console.log(`   活跃订阅数: ${analyticsData.data?.overview?.activeSubscriptions}`);
        console.log(`   总收入: $${analyticsData.data?.overview?.totalRevenue?.toFixed(2)}`);
      } else if (analyticsResponse.status === 403) {
        console.log('❌ 管理员无法访问数据分析API - 权限验证失败');
      } else {
        console.log('❌ 分析API调用失败:', analyticsResponse.status);
      }

    } else {
      const errorData = await adminLoginResponse.json();
      console.log('❌ 管理员登录API调用失败:', errorData.error);
      console.log(`   状态码: ${adminLoginResponse.status}`);
    }

    // 3. 测试非管理员邮箱
    console.log('\n🔒 测试非管理员邮箱...');
    const nonAdminResponse = await fetch(`${baseUrl}/api/auth/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'admin',
        email: 'nonadmin@example.com'
      })
    });

    if (nonAdminResponse.status === 403) {
      console.log('✅ 非管理员邮箱被正确拒绝');
    } else {
      console.log('⚠️ 非管理员邮箱未被拒绝，可能存在安全问题');
    }

    // 4. 测试无效模式
    console.log('\n❌ 测试无效登录模式...');
    const invalidModeResponse = await fetch(`${baseUrl}/api/auth/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'invalid',
        email: 'admin@example.com'
      })
    });

    if (invalidModeResponse.status === 400) {
      console.log('✅ 无效登录模式被正确拒绝');
    } else {
      console.log('⚠️ 无效登录模式未被拒绝');
    }

    console.log('\n🎉 管理员登录功能测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testAdminLogin();

