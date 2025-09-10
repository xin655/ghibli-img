const fs = require('fs');
const path = require('path');

// 快速管理员设置脚本
function quickAdminSetup() {
  console.log('🚀 快速管理员设置工具\n');

  // 1. 检查 .env.local 文件
  const envPath = path.join(process.cwd(), '.env.local');
  const envExists = fs.existsSync(envPath);

  if (!envExists) {
    console.log('📝 创建 .env.local 文件...');
    
    const envContent = `# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ghibli-img

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here

# Stripe配置
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# 管理员邮箱配置（用逗号分隔多个邮箱）
ADMIN_EMAILS=admin@example.com,test@example.com
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,test@example.com

# Google OAuth配置
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 应用配置
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env.local 文件已创建');
  } else {
    console.log('✅ .env.local 文件已存在');
  }

  // 2. 读取现有配置
  let envContent = '';
  if (envExists) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // 3. 检查管理员配置
  const hasAdminEmails = envContent.includes('ADMIN_EMAILS=');
  const hasPublicAdminEmails = envContent.includes('NEXT_PUBLIC_ADMIN_EMAILS=');

  if (!hasAdminEmails || !hasPublicAdminEmails) {
    console.log('📝 添加管理员邮箱配置...');
    
    // 添加管理员配置
    if (!hasAdminEmails) {
      envContent += '\n# 管理员邮箱配置\nADMIN_EMAILS=admin@example.com,test@example.com\n';
    }
    if (!hasPublicAdminEmails) {
      envContent += 'NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,test@example.com\n';
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ 管理员邮箱配置已添加');
  } else {
    console.log('✅ 管理员邮箱配置已存在');
  }

  // 4. 显示当前配置
  console.log('\n📋 当前管理员配置:');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.includes('ADMIN_EMAILS=')) {
      console.log(`   ${line}`);
    }
  });

  // 5. 提供下一步指导
  console.log('\n🎯 下一步操作:');
  console.log('1. 编辑 .env.local 文件，将 admin@example.com 替换为您的实际邮箱');
  console.log('2. 重启应用: npm run dev');
  console.log('3. 使用您的邮箱登录系统');
  console.log('4. 访问数据分析页面: http://localhost:3000/analytics\n');

  console.log('🔧 自定义管理员邮箱:');
  console.log('   编辑 .env.local 文件中的 ADMIN_EMAILS 和 NEXT_PUBLIC_ADMIN_EMAILS');
  console.log('   例如: ADMIN_EMAILS=your-email@company.com,manager@company.com\n');

  console.log('✅ 快速管理员设置完成！');
  console.log('   请按照上述步骤完成配置并重启应用。');
}

quickAdminSetup();

