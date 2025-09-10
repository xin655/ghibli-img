const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// 快速测试Stripe webhook事件
async function quickTest() {
  console.log('🚀 快速Stripe Webhook测试\n');
  
  try {
    // 1. 检查Stripe CLI是否可用
    console.log('1️⃣ 检查Stripe CLI...');
    try {
      const { stdout } = await execAsync('stripe --version');
      console.log('✅ Stripe CLI已安装:', stdout.trim());
    } catch (error) {
      console.error('❌ Stripe CLI未安装或不在PATH中');
      console.log('💡 请从 https://stripe.com/docs/stripe-cli 下载并安装');
      return;
    }
    
    // 2. 检查是否已登录
    console.log('\n2️⃣ 检查Stripe登录状态...');
    try {
      const { stdout } = await execAsync('stripe config --list');
      if (stdout.includes('test_mode_api_key')) {
        console.log('✅ 已登录Stripe账户');
      } else {
        console.log('⚠️ 未登录Stripe账户');
        console.log('💡 请运行: stripe login');
        return;
      }
    } catch (error) {
      console.log('⚠️ 无法检查登录状态');
    }
    
    // 3. 触发测试事件
    console.log('\n3️⃣ 触发测试事件...');
    
    const testEvents = [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated'
    ];
    
    for (const event of testEvents) {
      console.log(`\n📤 触发 ${event} 事件...`);
      try {
        const { stdout, stderr } = await execAsync(`stripe trigger ${event}`);
        if (stdout) {
          console.log('✅ 事件触发成功');
          // 提取事件ID
          const eventIdMatch = stdout.match(/evt_[a-zA-Z0-9]+/);
          if (eventIdMatch) {
            console.log(`📋 事件ID: ${eventIdMatch[0]}`);
          }
        }
        if (stderr) {
          console.log('⚠️ 警告:', stderr);
        }
      } catch (error) {
        console.error(`❌ 触发 ${event} 失败:`, error.message);
      }
      
      // 等待一下
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 快速测试完成！');
    console.log('\n📋 下一步:');
    console.log('  1. 检查应用日志中的webhook处理信息');
    console.log('  2. 运行 node scripts/check-user-status.js 检查用户状态');
    console.log('  3. 查看Stripe Dashboard中的事件日志');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  quickTest();
}

module.exports = { quickTest };
