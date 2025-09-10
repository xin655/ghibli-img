#!/usr/bin/env node

/**
 * 环境变量检查脚本
 * 用于验证必要的环境变量是否已正确设置
 */

const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'GOOGLE_CLIENT_ID',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_ID_BASIC',
  'STRIPE_PRICE_ID_PRO',
  'STRIPE_PRICE_ID_ENTERPRISE',
  'APP_BASE_URL'
];

const optionalEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'S3_BUCKET_NAME',
  'OPENAI_API_KEY'
];

console.log('🔍 检查环境变量配置...\n');

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

let hasErrors = false;
let hasWarnings = false;

// 检查必需的环境变量
console.log('📋 必需的环境变量:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: 未设置`);
    hasErrors = true;
  } else if (value.includes('your_') || value.includes('_here')) {
    console.log(`⚠️  ${varName}: 使用默认值，请更新为实际值`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${varName}: 已设置`);
  }
});

console.log('\n📋 可选的环境变量:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚪ ${varName}: 未设置 (可选)`);
  } else if (value.includes('your_') || value.includes('_here')) {
    console.log(`⚠️  ${varName}: 使用默认值，请更新为实际值`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${varName}: 已设置`);
  }
});

console.log('\n📊 检查结果:');

if (hasErrors) {
  console.log('❌ 发现错误: 某些必需的环境变量未设置');
  console.log('💡 请参考 ENVIRONMENT_SETUP_GUIDE.md 进行配置');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  发现警告: 某些环境变量使用默认值');
  console.log('💡 建议更新为实际值以获得完整功能');
  process.exit(0);
} else {
  console.log('✅ 所有环境变量配置正确');
  process.exit(0);
}

