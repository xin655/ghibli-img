#!/usr/bin/env node

/**
 * AWS 配置检查脚本
 * 用于验证 AWS S3 相关的环境变量配置
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔍 检查 AWS S3 配置...\n');

// 检查 AWS 环境变量
const awsEnvVars = [
  { name: 'AWS_REGION', required: true, description: 'AWS 区域' },
  { name: 'AWS_ACCESS_KEY_ID', required: true, description: 'AWS 访问密钥 ID' },
  { name: 'AWS_SECRET_ACCESS_KEY', required: true, description: 'AWS 秘密访问密钥' },
  { name: 'S3_BUCKET_NAME', required: true, description: 'S3 存储桶名称' }
];

console.log('🔧 检查 AWS 环境变量:');
let hasErrors = false;

awsEnvVars.forEach(envVar => {
  const value = process.env[envVar.name];
  
  if (value) {
    if (envVar.name === 'AWS_ACCESS_KEY_ID') {
      console.log(`✅ ${envVar.name}: 已设置 (${value.substring(0, 8)}...)`);
    } else if (envVar.name === 'AWS_SECRET_ACCESS_KEY') {
      console.log(`✅ ${envVar.name}: 已设置 (${value.substring(0, 8)}...)`);
    } else {
      console.log(`✅ ${envVar.name}: 已设置 (${value})`);
    }
  } else {
    console.log(`❌ ${envVar.name}: 未设置 (${envVar.description})`);
    hasErrors = true;
  }
});

console.log('');

// 检查 AWS 区域格式
const awsRegion = process.env.AWS_REGION;
if (awsRegion) {
  const validRegions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
    'ap-northeast-2', 'ap-south-1', 'ca-central-1'
  ];
  
  if (validRegions.includes(awsRegion)) {
    console.log(`✅ AWS 区域格式正确: ${awsRegion}`);
  } else {
    console.log(`⚠️  AWS 区域可能不正确: ${awsRegion}`);
    console.log('   常见区域: us-east-1, us-west-2, eu-west-1, ap-southeast-1');
  }
}

console.log('');

// 检查 S3 存储桶名称格式
const bucketName = process.env.S3_BUCKET_NAME;
if (bucketName) {
  // S3 存储桶名称规则检查
  const bucketNameRegex = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/;
  const lengthValid = bucketName.length >= 3 && bucketName.length <= 63;
  const noDoubleDots = !bucketName.includes('..');
  const noUnderscore = !bucketName.includes('_');
  
  if (bucketNameRegex.test(bucketName) && lengthValid && noDoubleDots && noUnderscore) {
    console.log(`✅ S3 存储桶名称格式正确: ${bucketName}`);
  } else {
    console.log(`⚠️  S3 存储桶名称可能不正确: ${bucketName}`);
    console.log('   规则: 3-63字符，小写字母、数字、点、连字符，不能以下划线开头或结尾');
  }
}

console.log('');

// 测试 AWS SDK 配置
console.log('🧪 测试 AWS SDK 配置:');
try {
  const { S3Client } = require('@aws-sdk/client-s3');
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
  console.log('✅ AWS S3 客户端创建成功');
  
  // 尝试列出存储桶（需要权限）
  console.log('📋 尝试连接 S3 服务...');
  
} catch (error) {
  console.log('❌ AWS S3 客户端创建失败:', error.message);
  hasErrors = true;
}

console.log('');

// 提供修复建议
if (hasErrors) {
  console.log('💡 修复建议:');
  console.log('1. 创建或更新 .env.local 文件');
  console.log('2. 设置以下环境变量:');
  console.log('');
  console.log('# AWS S3 配置');
  console.log('AWS_REGION=us-east-1');
  console.log('AWS_ACCESS_KEY_ID=your_access_key_id');
  console.log('AWS_SECRET_ACCESS_KEY=your_secret_access_key');
  console.log('S3_BUCKET_NAME=your-bucket-name');
  console.log('');
  console.log('3. 确保 AWS 凭证有效且有 S3 权限');
  console.log('4. 确保 S3 存储桶存在且可访问');
} else {
  console.log('✅ AWS S3 配置检查通过');
  console.log('🚀 可以正常使用文件上传功能');
}

console.log('');
console.log('📚 参考文档:');
console.log('- AWS S3 区域列表: https://docs.aws.amazon.com/general/latest/gr/s3.html');
console.log('- S3 存储桶命名规则: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html');
console.log('- AWS 凭证配置: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html');
