const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// 订阅通知脚本
class StripeNotificationManager {
  constructor() {
    this.events = {
      'subscription-created': {
        command: 'stripe trigger customer.subscription.created',
        description: '订阅创建通知',
        message: '🎉 新订阅已创建！用户已成功订阅服务。'
      },
      'subscription-updated': {
        command: 'stripe trigger customer.subscription.updated',
        description: '订阅更新通知',
        message: '🔄 订阅已更新！用户订阅状态发生变化。'
      },
      'subscription-cancelled': {
        command: 'stripe trigger customer.subscription.deleted',
        description: '订阅取消通知',
        message: '❌ 订阅已取消！用户取消了订阅服务。'
      },
      'payment-succeeded': {
        command: 'stripe trigger invoice.payment_succeeded',
        description: '支付成功通知',
        message: '💰 支付成功！订阅费用已成功收取。'
      },
      'payment-failed': {
        command: 'stripe trigger invoice.payment_failed',
        description: '支付失败通知',
        message: '⚠️ 支付失败！订阅费用收取失败。'
      },
      'checkout-completed': {
        command: 'stripe trigger checkout.session.completed',
        description: '结账完成通知',
        message: '✅ 结账完成！用户已完成订阅流程。'
      }
    };
  }

  // 执行Stripe CLI命令
  async executeCommand(command) {
    try {
      console.log(`🔧 执行命令: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      
      if (stdout) {
        console.log('📤 输出:', stdout.trim());
      }
      
      if (stderr) {
        console.log('⚠️ 警告:', stderr.trim());
      }
      
      return { success: true, output: stdout, error: stderr };
    } catch (error) {
      console.error('❌ 命令执行失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 发送单个通知
  async sendNotification(eventType) {
    const event = this.events[eventType];
    if (!event) {
      console.error(`❌ 未知的事件类型: ${eventType}`);
      return false;
    }

    console.log(`\n📢 ${event.description}`);
    console.log(`💬 ${event.message}`);
    
    const result = await this.executeCommand(event.command);
    
    if (result.success) {
      console.log(`✅ ${event.description}发送成功`);
      return true;
    } else {
      console.log(`❌ ${event.description}发送失败`);
      return false;
    }
  }

  // 发送多个通知
  async sendMultipleNotifications(eventTypes) {
    console.log(`\n🚀 开始发送 ${eventTypes.length} 个通知...\n`);
    
    for (let i = 0; i < eventTypes.length; i++) {
      const eventType = eventTypes[i];
      console.log(`\n[${i + 1}/${eventTypes.length}] 处理 ${eventType}...`);
      
      await this.sendNotification(eventType);
      
      // 等待一下，避免请求过于频繁
      if (i < eventTypes.length - 1) {
        console.log('⏳ 等待2秒...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n🎉 所有通知发送完成！');
  }

  // 发送订阅生命周期通知
  async sendSubscriptionLifecycle() {
    const lifecycle = [
      'checkout-completed',
      'subscription-created',
      'payment-succeeded',
      'subscription-updated',
      'subscription-cancelled'
    ];
    
    console.log('🔄 发送订阅生命周期通知...');
    await this.sendMultipleNotifications(lifecycle);
  }

  // 发送支付相关通知
  async sendPaymentNotifications() {
    const paymentEvents = [
      'payment-succeeded',
      'payment-failed',
      'payment-succeeded'
    ];
    
    console.log('💰 发送支付相关通知...');
    await this.sendMultipleNotifications(paymentEvents);
  }

  // 列出所有可用的事件
  listAvailableEvents() {
    console.log('\n📋 可用的通知事件:');
    Object.keys(this.events).forEach((eventType, index) => {
      const event = this.events[eventType];
      console.log(`  ${index + 1}. ${eventType} - ${event.description}`);
    });
  }

  // 检查Stripe CLI状态
  async checkStripeStatus() {
    console.log('🔍 检查Stripe CLI状态...');
    
    try {
      // 检查版本
      const { stdout: version } = await execAsync('stripe --version');
      console.log('✅ Stripe CLI版本:', version.trim());
      
      // 检查登录状态
      try {
        const { stdout: config } = await execAsync('stripe config --list');
        if (config.includes('test_mode_api_key')) {
          console.log('✅ 已登录Stripe账户');
          return true;
        } else {
          console.log('⚠️ 未登录Stripe账户');
          console.log('💡 请运行: stripe login');
          return false;
        }
      } catch (error) {
        console.log('⚠️ 无法检查登录状态');
        return false;
      }
    } catch (error) {
      console.error('❌ Stripe CLI未安装或不在PATH中');
      console.log('💡 请从 https://stripe.com/docs/stripe-cli 下载并安装');
      return false;
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const manager = new StripeNotificationManager();
  
  if (args.length === 0) {
    console.log('🚀 Stripe订阅通知管理器');
    console.log('\n使用方法:');
    console.log('  node scripts/stripe-notifications.js <事件类型>');
    console.log('  node scripts/stripe-notifications.js list');
    console.log('  node scripts/stripe-notifications.js lifecycle');
    console.log('  node scripts/stripe-notifications.js payment');
    console.log('  node scripts/stripe-notifications.js status');
    console.log('\n示例:');
    console.log('  node scripts/stripe-notifications.js subscription-created');
    console.log('  node scripts/stripe-notifications.js lifecycle');
    
    manager.listAvailableEvents();
    return;
  }
  
  const command = args[0];
  
  // 检查Stripe CLI状态
  const isReady = await manager.checkStripeStatus();
  if (!isReady) {
    return;
  }
  
  switch (command) {
    case 'list':
      manager.listAvailableEvents();
      break;
      
    case 'lifecycle':
      await manager.sendSubscriptionLifecycle();
      break;
      
    case 'payment':
      await manager.sendPaymentNotifications();
      break;
      
    case 'status':
      // 状态检查已经在上面完成
      break;
      
    default:
      if (manager.events[command]) {
        await manager.sendNotification(command);
      } else {
        console.error(`❌ 未知的命令: ${command}`);
        console.log('\n可用的命令:');
        manager.listAvailableEvents();
      }
      break;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = StripeNotificationManager;

