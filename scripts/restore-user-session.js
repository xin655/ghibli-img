const fetch = require('node-fetch');

// 恢复用户会话数据
async function restoreUserSession() {
  console.log('🔄 恢复用户会话数据...\n');

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
      
      // 2. 生成恢复脚本
      console.log('\n📝 生成用户会话恢复脚本...');
      
      const restoreScript = `
// 用户会话恢复脚本
// 在浏览器控制台中运行此脚本

console.log('🔄 开始恢复用户会话...');

// 清除旧数据
localStorage.removeItem('jwt');
localStorage.removeItem('user');
localStorage.removeItem('userState');
localStorage.removeItem('token'); // 清除可能存在的错误键名

// 设置新的用户数据
localStorage.setItem('jwt', '${adminData.token}');
localStorage.setItem('user', '${JSON.stringify(adminData.user)}');
localStorage.setItem('userState', '${JSON.stringify(adminData.userState)}');

console.log('✅ 用户会话已恢复');
console.log('用户信息:', JSON.parse(localStorage.getItem('user')));
console.log('用户状态:', JSON.parse(localStorage.getItem('userState')));

// 刷新页面
window.location.reload();
`;

      console.log('📋 请在浏览器控制台中运行以下脚本:');
      console.log('```javascript');
      console.log(restoreScript);
      console.log('```');

      // 3. 提供手动恢复步骤
      console.log('\n🔧 手动恢复步骤:');
      console.log('1. 打开浏览器开发者工具 (F12)');
      console.log('2. 切换到 Console 标签页');
      console.log('3. 复制并粘贴上面的脚本');
      console.log('4. 按回车键执行');
      console.log('5. 页面会自动刷新');
      console.log('6. 检查用户菜单中是否显示"📈 数据分析"选项');

      // 4. 验证数据
      console.log('\n✅ 验证数据:');
      console.log(`   Token: ${adminData.token ? '已生成' : '未生成'}`);
      console.log(`   用户邮箱: ${adminData.user?.email}`);
      console.log(`   用户姓名: ${adminData.user?.name}`);
      console.log(`   管理员权限: ${adminData.userState?.isAdmin ? '是' : '否'}`);
      console.log(`   订阅计划: ${adminData.userState?.subscriptionPlan}`);
      console.log(`   使用次数: ${adminData.userState?.freeTrialsRemaining === -1 ? '无限制' : adminData.userState?.freeTrialsRemaining}`);

    } else {
      console.log('❌ 管理员登录失败');
    }

    // 5. 提供替代方案
    console.log('\n🔄 替代恢复方案:');
    console.log('如果上述方法不工作，请尝试:');
    console.log('1. 完全清除浏览器缓存和localStorage');
    console.log('2. 重新访问登录页面: http://localhost:3000/login');
    console.log('3. 点击"🔑 使用测试管理员模式登录"');
    console.log('4. 检查是否自动跳转到首页');
    console.log('5. 检查用户菜单中是否显示管理员选项');

  } catch (error) {
    console.error('❌ 恢复过程中出错:', error.message);
  }
}

restoreUserSession();

