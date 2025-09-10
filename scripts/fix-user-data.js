const fetch = require('node-fetch');

// 修复用户数据丢失问题
async function fixUserData() {
  console.log('🔧 修复用户数据丢失问题...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // 1. 生成一个新的有效token
    console.log('🔑 生成新的有效token...');
    
    // 使用管理员登录获取一个有效的token
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
      console.log('✅ 管理员登录成功，获得有效token');
      
      // 2. 测试这个token是否能正常工作
      console.log('\n📊 测试token功能...');
      const analyticsResponse = await fetch(`${baseUrl}/api/billing/analytics`, {
        headers: {
          'Authorization': `Bearer ${adminData.token}`,
        },
      });

      if (analyticsResponse.ok) {
        console.log('✅ Token功能正常');
        
        // 3. 提供修复建议
        console.log('\n🔧 修复建议:');
        console.log('1. 清除浏览器localStorage中的旧数据');
        console.log('2. 使用管理员登录重新获取token');
        console.log('3. 检查token存储键名是否正确');
        
        console.log('\n📋 正确的localStorage设置:');
        console.log(`   localStorage.setItem('jwt', '${adminData.token}');`);
        console.log(`   localStorage.setItem('user', '${JSON.stringify(adminData.user)}');`);
        console.log(`   localStorage.setItem('userState', '${JSON.stringify(adminData.userState)}');`);
        
        console.log('\n🎯 测试步骤:');
        console.log('1. 打开浏览器开发者工具');
        console.log('2. 清除localStorage: localStorage.clear()');
        console.log('3. 访问登录页面: http://localhost:3000/login');
        console.log('4. 点击"🔑 使用测试管理员模式登录"');
        console.log('5. 检查localStorage中是否正确存储了数据');
        console.log('6. 访问分析页面: http://localhost:3000/analytics');
        
      } else {
        console.log('❌ Token功能异常:', analyticsResponse.status);
      }
    } else {
      console.log('❌ 管理员登录失败');
    }

    // 4. 检查环境变量
    console.log('\n🔍 环境变量检查:');
    console.log('请确保以下环境变量已正确设置:');
    console.log('   ADMIN_EMAILS=admin@example.com,test@example.com');
    console.log('   NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,test@example.com');
    console.log('   JWT_SECRET=your-secret-key');
    console.log('   MONGODB_URI=mongodb://localhost:27017/ghibli-img');

  } catch (error) {
    console.error('❌ 修复过程中出错:', error.message);
  }
}

fixUserData();

