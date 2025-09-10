const fetch = require('node-fetch');

// 检查token存储和用户数据问题
async function checkTokenStorage() {
  console.log('🔍 检查token存储和用户数据问题...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // 1. 测试管理员登录
    console.log('🔑 测试管理员登录...');
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
      console.log('✅ 管理员登录成功');
      console.log(`   Token: ${adminData.token ? '已生成' : '未生成'}`);
      console.log(`   用户信息: ${adminData.user ? '已返回' : '未返回'}`);
      console.log(`   用户状态: ${adminData.userState ? '已返回' : '未返回'}`);
      
      if (adminData.user) {
        console.log(`   用户邮箱: ${adminData.user.email}`);
        console.log(`   用户姓名: ${adminData.user.name}`);
      }
      
      if (adminData.userState) {
        console.log(`   管理员权限: ${adminData.userState.isAdmin ? '是' : '否'}`);
        console.log(`   订阅计划: ${adminData.userState.subscriptionPlan}`);
        console.log(`   使用次数: ${adminData.userState.freeTrialsRemaining === -1 ? '无限制' : adminData.userState.freeTrialsRemaining}`);
      }

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
      } else if (analyticsResponse.status === 401) {
        console.log('❌ 分析API返回401 - token无效或过期');
      } else if (analyticsResponse.status === 403) {
        console.log('❌ 分析API返回403 - 无管理员权限');
      } else {
        console.log(`❌ 分析API调用失败: ${analyticsResponse.status}`);
        const errorData = await analyticsResponse.json().catch(() => ({}));
        console.log(`   错误信息: ${errorData.error || '未知错误'}`);
      }

    } else {
      const errorData = await adminLoginResponse.json();
      console.log('❌ 管理员登录失败:', errorData.error);
    }

    // 3. 测试普通用户登录
    console.log('\n👤 测试普通用户登录...');
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';
    
    const userStatusResponse = await fetch(`${baseUrl}/api/billing/usage`, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
      },
    });

    if (userStatusResponse.ok) {
      const userData = await userStatusResponse.json();
      console.log('✅ 普通用户状态获取成功');
      console.log(`   用户邮箱: ${userData.user?.email}`);
      console.log(`   订阅计划: ${userData.subscription?.plan}`);
    } else {
      console.log('❌ 普通用户状态获取失败:', userStatusResponse.status);
    }

    console.log('\n🔧 问题诊断:');
    console.log('1. 检查localStorage中的token键名是否正确');
    console.log('2. 检查JWT token是否有效');
    console.log('3. 检查用户状态是否正确设置');
    console.log('4. 检查管理员权限验证逻辑');

  } catch (error) {
    console.error('❌ 检查过程中出错:', error.message);
  }
}

checkTokenStorage();

