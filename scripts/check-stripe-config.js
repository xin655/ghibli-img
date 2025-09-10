#!/usr/bin/env node

/**
 * Stripe 配置检查脚本
 * 用于验证 Stripe 相关的环境变量配置
 */

require('dotenv').config({ path: '.env.local' });

const requiredStripeVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_ID_BASIC',
  'STRIPE_PRICE_ID_PRO', 
  'STRIPE_PRICE_ID_ENTERPRISE'
];

const optionalVars = [
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'APP_BASE_URL'
];

console.log('🔍 检查 Stripe 配置...\n');

let hasErrors = false;

// 检查必需的环境变量
console.log('📋 必需的环境变量:');
requiredStripeVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: 未设置`);
    hasErrors = true;
  } else {
    // 检查格式
    if (varName === 'STRIPE_SECRET_KEY') {
      if (!value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
        console.log(`⚠️  ${varName}: 格式可能不正确 (应以 sk_test_ 或 sk_live_ 开头)`);
      } else {
        console.log(`✅ ${varName}: 已设置 (${value.substring(0, 12)}...)`);
      }
    } else if (varName.startsWith('STRIPE_PRICE_ID_')) {
      if (!value.startsWith('price_')) {
        console.log(`⚠️  ${varName}: 格式可能不正确 (应以 price_ 开头)`);
      } else {
        console.log(`✅ ${varName}: 已设置 (${value})`);
      }
    } else {
      console.log(`✅ ${varName}: 已设置`);
    }
  }
});

console.log('\n📋 可选的环境变量:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚪ ${varName}: 未设置 (可选)`);
  } else {
    console.log(`✅ ${varName}: 已设置`);
  }
});

// 检查 Stripe 密钥格式
console.log('\n🔑 Stripe 密钥检查:');
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (stripeKey) {
  if (stripeKey.startsWith('sk_test_')) {
    console.log('✅ 使用测试环境密钥 (sk_test_)');
  } else if (stripeKey.startsWith('sk_live_')) {
    console.log('⚠️  使用生产环境密钥 (sk_live_) - 请确保这是有意的');
  } else {
    console.log('❌ Stripe 密钥格式不正确');
    hasErrors = true;
  }
}

// 检查价格 ID 格式
console.log('\n💰 价格 ID 检查:');
const priceIds = {
  basic: process.env.STRIPE_PRICE_ID_BASIC,
  pro: process.env.STRIPE_PRICE_ID_PRO,
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE
};

Object.entries(priceIds).forEach(([plan, priceId]) => {
  if (priceId) {
    if (priceId.startsWith('price_')) {
      console.log(`✅ ${plan.toUpperCase()} 价格 ID: ${priceId}`);
    } else {
      console.log(`❌ ${plan.toUpperCase()} 价格 ID 格式不正确: ${priceId}`);
      hasErrors = true;
    }
  }
});

// 总结
console.log('\n📊 检查结果:');
if (hasErrors) {
  console.log('❌ 发现配置问题，请修复后重试');
  console.log('\n💡 解决方案:');
  console.log('1. 确保 .env.local 文件存在');
  console.log('2. 设置正确的 Stripe 密钥和价格 ID');
  console.log('3. 参考 STRIPE_PRICE_SETUP_GUIDE.md 创建 Stripe 价格');
  process.exit(1);
} else {
  console.log('✅ Stripe 配置检查通过');
  console.log('\n🚀 可以启动订阅功能测试');
}

// 提供快速修复建议
console.log('\n🔧 快速修复建议:');
if (!process.env.STRIPE_SECRET_KEY) {
  console.log('1. 获取 Stripe 密钥: https://dashboard.stripe.com/apikeys');
}
if (!process.env.STRIPE_PRICE_ID_BASIC) {
  console.log('2. 创建 Stripe 价格: https://dashboard.stripe.com/products');
}
if (!process.env.APP_BASE_URL) {
  console.log('3. 设置 APP_BASE_URL=http://localhost:3000');
}
