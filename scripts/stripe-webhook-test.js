const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Stripe CLI webhook测试命令
const stripeCommands = {
  // 模拟checkout.session.completed事件
  'checkout.session.completed': `stripe.exe events resend evt_1QZxXx2eZvKYlo2C0KjXjQ0x`,
  
  // 模拟customer.subscription.created事件
  'customer.subscription.created': `stripe.exe events resend evt_1QZxXy2eZvKYlo2C0KjXjQ0x`,
  
  // 模拟customer.subscription.updated事件
  'customer.subscription.updated': `stripe.exe events resend evt_1QZxXz2eZvKYlo2C0KjXjQ0x`,
  
  // 模拟customer.subscription.deleted事件
  'customer.subscription.deleted': `stripe.exe events resend evt_1QZxX02eZvKYlo2C0KjXjQ0x`,
  
  // 模拟invoice.payment_succeeded事件
  'invoice.payment_succeeded': `stripe.exe events resend evt_1QZxX12eZvKYlo2C0KjXjQ0x`,
  
  // 模拟invoice.payment_failed事件
  'invoice.payment_failed': `stripe.exe events resend evt_1QZxX22eZvKYlo2C0KjXjQ0x`
};

// 执行Stripe CLI命令
async function executeStripeCommand(command) {
  try {
    console.log(`🔧 执行命令: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stdout) {
      console.log('📤 输出:', stdout);
    }
    
    if (stderr) {
      console.log('⚠️ 警告:', stderr);
    }
    
    return { success: true, output: stdout, error: stderr };
  } catch (error) {
    console.error('❌ 命令执行失败:', error.message);
    return { success: false, error: error.message };
  }
}

// 测试特定的webhook事件
async function testWebhookEvent(eventType) {
  console.log(`\n🧪 测试 ${eventType} 事件...`);
  
  const command = stripeCommands[eventType];
  if (!command) {
    console.error(`❌ 未找到事件类型: ${eventType}`);
    return false;
  }
  
  const result = await executeStripeCommand(command);
  
  if (result.success) {
    console.log(`✅ ${eventType} 事件发送成功`);
    return true;
  } else {
    console.log(`❌ ${eventType} 事件发送失败`);
    return false;
  }
}

// 列出可用的测试事件
function listAvailableEvents() {
  console.log('\n📋 可用的测试事件:');
  Object.keys(stripeCommands).forEach((eventType, index) => {
    console.log(`  ${index + 1}. ${eventType}`);
  });
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🚀 Stripe Webhook测试工具');
    console.log('\n使用方法:');
    console.log('  node scripts/stripe-webhook-test.js <事件类型>');
    console.log('  node scripts/stripe-webhook-test.js list');
    console.log('  node scripts/stripe-webhook-test.js all');
    
    listAvailableEvents();
    return;
  }
  
  const command = args[0];
  
  if (command === 'list') {
    listAvailableEvents();
    return;
  }
  
  if (command === 'all') {
    console.log('🧪 测试所有webhook事件...\n');
    
    for (const eventType of Object.keys(stripeCommands)) {
      await testWebhookEvent(eventType);
      // 等待一下让处理完成
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 所有webhook事件测试完成！');
    return;
  }
  
  // 测试单个事件
  if (stripeCommands[command]) {
    await testWebhookEvent(command);
  } else {
    console.error(`❌ 未知的事件类型: ${command}`);
    console.log('\n可用的命令:');
    listAvailableEvents();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  executeStripeCommand,
  testWebhookEvent,
  listAvailableEvents
};

