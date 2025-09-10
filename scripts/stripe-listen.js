const { spawn } = require('child_process');
const path = require('path');

// Stripe CLI listen命令配置
const stripeListenCommand = 'stripe.exe';
const stripeListenArgs = [
  'listen',
  '--forward-to',
  'localhost:3000/api/billing/webhook',
  '--events',
  'checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed'
];

console.log('🚀 启动Stripe CLI Webhook监听器...');
console.log('📡 监听事件:', stripeListenArgs[6]);
console.log('🎯 转发到:', stripeListenArgs[4]);
console.log('\n按 Ctrl+C 停止监听\n');

// 启动Stripe CLI listen进程
const stripeProcess = spawn(stripeListenCommand, stripeListenArgs, {
  stdio: 'inherit',
  shell: true
});

// 处理进程事件
stripeProcess.on('error', (error) => {
  console.error('❌ Stripe CLI启动失败:', error.message);
  console.log('\n💡 请确保:');
  console.log('  1. 已安装Stripe CLI');
  console.log('  2. 已登录Stripe账户 (stripe login)');
  console.log('  3. Stripe CLI在系统PATH中');
});

stripeProcess.on('close', (code) => {
  console.log(`\n🔚 Stripe CLI进程结束，退出码: ${code}`);
});

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n⏹️ 正在停止Stripe CLI监听器...');
  stripeProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ 正在停止Stripe CLI监听器...');
  stripeProcess.kill('SIGTERM');
});

// 显示使用说明
console.log('📖 使用说明:');
console.log('  1. 确保你的应用正在运行 (npm run dev)');
console.log('  2. 在另一个终端中运行此脚本');
console.log('  3. 在Stripe Dashboard中触发测试事件');
console.log('  4. 或者使用Stripe CLI发送测试事件');
console.log('\n🔧 测试命令示例:');
console.log('  stripe.exe trigger checkout.session.completed');
console.log('  stripe.exe trigger customer.subscription.created');
console.log('  stripe.exe trigger customer.subscription.updated');
console.log('  stripe.exe trigger customer.subscription.deleted');
console.log('\n⏳ 等待webhook事件...\n');

