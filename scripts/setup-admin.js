const fetch = require('node-fetch');

// 管理员设置脚本
async function setupAdmin() {
  console.log('🔧 管理员账户设置向导\n');

  const baseUrl = 'http://localhost:3000';

  // 1. 检查当前环境变量
  console.log('📋 步骤1: 检查环境变量配置');
  console.log('请确保在 .env.local 文件中设置了以下变量:');
  console.log('   ADMIN_EMAILS=admin@example.com,your-admin@example.com');
  console.log('   NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,your-admin@example.com');
  console.log('   JWT_SECRET=your-secret-key');
  console.log('   MONGODB_URI=mongodb://localhost:27017/ghibli-img\n');

  // 2. 测试当前用户状态
  console.log('📋 步骤2: 测试当前用户状态');
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGJmYzM1ZTJjOWE4Y2M5ZDhkODc2ZjYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJnb29nbGVJZCI6InRlc3QtZ29vZ2xlLWlkLTEyMyIsImlhdCI6MTc1NzM5Nzk2NCwiZXhwIjoxNzU4MDAyNzY0fQ.murQlJiyUq6FasESHMnyYzBdAIZwXaTjoCZ3RG-lqWA';

  try {
    const userStatusResponse = await fetch(`${baseUrl}/api/billing/usage`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (userStatusResponse.ok) {
      const userData = await userStatusResponse.json();
      console.log('✅ 当前用户信息:');
      console.log(`   邮箱: ${userData.user?.email}`);
      console.log(`   姓名: ${userData.user?.name}`);
      console.log(`   订阅计划: ${userData.subscription?.plan}`);
    } else {
      console.log('❌ 无法获取用户状态');
    }
  } catch (error) {
    console.log('❌ 用户状态检查失败:', error.message);
  }

  // 3. 测试管理员权限
  console.log('\n📋 步骤3: 测试管理员权限');
  try {
    const analyticsResponse = await fetch(`${baseUrl}/api/billing/analytics`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (analyticsResponse.ok) {
      console.log('✅ 管理员权限验证成功 - 可以访问数据分析页面');
    } else if (analyticsResponse.status === 403) {
      console.log('❌ 管理员权限验证失败 - 需要管理员权限');
      console.log('   解决方案: 将用户邮箱添加到 ADMIN_EMAILS 环境变量中');
    } else {
      console.log('❌ 权限检查失败:', analyticsResponse.status);
    }
  } catch (error) {
    console.log('❌ 权限检查失败:', error.message);
  }

  // 4. 提供设置指导
  console.log('\n📋 步骤4: 管理员设置指导');
  console.log('要设置管理员账户，请按以下步骤操作:\n');

  console.log('方法1: 通过环境变量设置（推荐）');
  console.log('1. 在项目根目录创建 .env.local 文件');
  console.log('2. 添加以下内容:');
  console.log('   ADMIN_EMAILS=admin@example.com,your-email@example.com');
  console.log('   NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,your-email@example.com');
  console.log('3. 重启应用: npm run dev\n');

  console.log('方法2: 通过数据库直接创建');
  console.log('1. 运行: node scripts/create-admin-user.js your-email@example.com');
  console.log('2. 将生成的邮箱添加到环境变量中\n');

  console.log('方法3: 升级现有用户');
  console.log('1. 将现有用户邮箱添加到 ADMIN_EMAILS 环境变量');
  console.log('2. 重启应用\n');

  // 5. 验证步骤
  console.log('📋 步骤5: 验证设置');
  console.log('设置完成后，请运行以下命令验证:');
  console.log('   node scripts/test-admin-analytics.js');
  console.log('   node scripts/check-env.js\n');

  console.log('🎯 管理员权限功能:');
  console.log('   ✅ 访问数据分析页面 (/analytics)');
  console.log('   ✅ 查看订阅统计和分析');
  console.log('   ✅ 查看收入和使用量数据');
  console.log('   ✅ 系统监控和管理功能\n');

  console.log('🔒 安全注意事项:');
  console.log('   ⚠️ 不要将 .env.local 文件提交到版本控制');
  console.log('   ⚠️ 使用强密码作为JWT_SECRET');
  console.log('   ⚠️ 定期检查管理员列表');
  console.log('   ⚠️ 及时移除离职员工权限\n');

  console.log('✅ 管理员设置向导完成！');
}

setupAdmin();

