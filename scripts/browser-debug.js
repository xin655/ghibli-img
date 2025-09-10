/**
 * 浏览器控制台调试脚本
 * 在浏览器开发者工具的 Console 中运行此脚本
 */

console.log('🔍 开始浏览器端调试...\n');

// 1. 检查 localStorage 中的 token
console.log('📋 1. 检查 localStorage 中的 token:');
const token = localStorage.getItem('jwt');
if (token) {
  console.log('✅ 找到 JWT token');
  console.log(`   Token 长度: ${token.length}`);
  console.log(`   Token 前50字符: ${token.substring(0, 50)}...`);
  
  // 尝试解码 token (不验证签名)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('✅ Token 解码成功:');
    console.log(`   用户ID: ${payload.userId}`);
    console.log(`   邮箱: ${payload.email}`);
    console.log(`   过期时间: ${new Date(payload.exp * 1000).toLocaleString()}`);
    console.log(`   是否过期: ${payload.exp * 1000 < Date.now() ? '是' : '否'}`);
  } catch (error) {
    console.log('❌ Token 解码失败:', error.message);
  }
} else {
  console.log('❌ 未找到 JWT token');
  console.log('💡 请先登录获取 token');
}

// 2. 检查用户数据
console.log('\n📋 2. 检查用户数据:');
const userData = localStorage.getItem('user');
if (userData) {
  try {
    const user = JSON.parse(userData);
    console.log('✅ 找到用户数据:');
    console.log(`   姓名: ${user.name}`);
    console.log(`   邮箱: ${user.email}`);
    console.log(`   ID: ${user.id}`);
  } catch (error) {
    console.log('❌ 用户数据解析失败:', error.message);
  }
} else {
  console.log('❌ 未找到用户数据');
}

// 3. 测试 checkout API 调用
console.log('\n📋 3. 测试 checkout API 调用:');
async function testCheckoutAPI() {
  if (!token) {
    console.log('❌ 无法测试：没有有效的 token');
    return;
  }

  try {
    console.log('🧪 发送测试请求...');
    const response = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ plan: 'basic' })
    });

    console.log(`   响应状态: ${response.status}`);
    console.log(`   响应头: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

    const data = await response.json();
    console.log(`   响应内容: ${JSON.stringify(data, null, 2)}`);

    if (response.status === 401) {
      console.log('❌ 401 错误 - 身份验证失败');
      console.log('💡 可能的原因:');
      console.log('   1. Token 已过期');
      console.log('   2. Token 格式错误');
      console.log('   3. JWT_SECRET 不匹配');
      console.log('   4. 用户不存在');
    } else if (response.status === 200) {
      console.log('✅ 请求成功！');
    } else {
      console.log(`⚠️  其他错误: ${response.status}`);
    }

  } catch (error) {
    console.log('❌ 请求失败:', error.message);
  }
}

// 4. 生成新的测试 token (如果需要)
console.log('\n📋 4. 生成新的测试 token:');
function generateTestToken() {
  // 这是一个示例，实际使用时需要从服务器获取
  console.log('💡 要生成新的 token，请:');
  console.log('   1. 重新登录');
  console.log('   2. 或者运行: localStorage.clear(); 然后重新登录');
}

// 5. 清除所有数据重新开始
console.log('\n📋 5. 清除所有数据:');
function clearAllData() {
  localStorage.removeItem('jwt');
  localStorage.removeItem('user');
  localStorage.removeItem('userState');
  localStorage.removeItem('token'); // 清除可能存在的错误键名
  console.log('✅ 已清除所有 localStorage 数据');
  console.log('💡 现在可以重新登录');
}

// 运行测试
testCheckoutAPI();

// 提供便捷函数
window.debugCheckout = testCheckoutAPI;
window.clearUserData = clearAllData;
window.generateTestToken = generateTestToken;

console.log('\n🛠️  可用的调试函数:');
console.log('   debugCheckout() - 测试 checkout API');
console.log('   clearUserData() - 清除所有用户数据');
console.log('   generateTestToken() - 显示生成新 token 的说明');
