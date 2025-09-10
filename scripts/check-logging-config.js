#!/usr/bin/env node

/**
 * 日志配置检查脚本
 * 用于验证日志系统的配置和依赖
 */

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');

console.log('🔍 检查日志系统配置...\n');

// 检查日志目录
function checkLogDirectory() {
  console.log('📁 检查日志目录:');
  
  const logDir = process.env.LOG_DIR || './logs';
  const fullPath = path.resolve(logDir);
  
  if (fs.existsSync(fullPath)) {
    console.log(`✅ 日志目录存在: ${fullPath}`);
    
    // 检查权限
    try {
      fs.accessSync(fullPath, fs.constants.R_OK | fs.constants.W_OK);
      console.log('✅ 目录权限正常');
    } catch (e) {
      console.log('❌ 目录权限不足');
    }
    
    // 列出现有日志文件
    const files = fs.readdirSync(fullPath).filter(file => file.endsWith('.log'));
    console.log(`📄 现有日志文件: ${files.length} 个`);
    if (files.length > 0) {
      files.slice(0, 5).forEach(file => {
        const filePath = path.join(fullPath, file);
        const stat = fs.statSync(filePath);
        const size = (stat.size / 1024).toFixed(2);
        console.log(`   - ${file} (${size} KB)`);
      });
      if (files.length > 5) {
        console.log(`   ... 还有 ${files.length - 5} 个文件`);
      }
    }
  } else {
    console.log(`❌ 日志目录不存在: ${fullPath}`);
    console.log('💡 建议: 创建日志目录或检查 LOG_DIR 环境变量');
  }
  
  console.log('');
}

// 检查环境变量
function checkEnvironmentVariables() {
  console.log('🔧 检查环境变量:');
  
  const envVars = [
    { name: 'LOG_DIR', required: false, default: './logs' },
    { name: 'LOG_MAX_FILE_SIZE', required: false, default: '10485760' },
    { name: 'LOG_MAX_FILES', required: false, default: '5' },
    { name: 'LOG_ENABLE_CONSOLE', required: false, default: 'true' },
    { name: 'LOG_ENABLE_FILE', required: false, default: 'true' },
    { name: 'LOG_DATE_PATTERN', required: false, default: 'YYYY-MM-DD' },
    { name: 'NODE_ENV', required: true }
  ];
  
  envVars.forEach(envVar => {
    const value = process.env[envVar.name];
    
    if (value) {
      console.log(`✅ ${envVar.name}: ${value}`);
      
      // 验证特定环境变量的值
      if (envVar.name === 'LOG_MAX_FILE_SIZE') {
        const size = parseInt(value);
        if (isNaN(size) || size <= 0) {
          console.log(`⚠️  ${envVar.name}: 值无效，应为正整数`);
        }
      }
      
      if (envVar.name === 'LOG_MAX_FILES') {
        const count = parseInt(value);
        if (isNaN(count) || count <= 0) {
          console.log(`⚠️  ${envVar.name}: 值无效，应为正整数`);
        }
      }
      
      if (envVar.name === 'LOG_ENABLE_CONSOLE' || envVar.name === 'LOG_ENABLE_FILE') {
        if (!['true', 'false'].includes(value.toLowerCase())) {
          console.log(`⚠️  ${envVar.name}: 值应为 'true' 或 'false'`);
        }
      }
    } else if (envVar.required) {
      console.log(`❌ ${envVar.name}: 未设置 (必需)`);
    } else {
      console.log(`⚪ ${envVar.name}: 未设置 (使用默认值: ${envVar.default})`);
    }
  });
  
  console.log('');
}

// 检查依赖包
function checkDependencies() {
  console.log('📦 检查依赖包:');
  
  const requiredPackages = [
    'fs',
    'path',
    'uuid'
  ];
  
  const optionalPackages = [
    'gzip',
    'compression'
  ];
  
  requiredPackages.forEach(pkg => {
    try {
      require(pkg);
      console.log(`✅ ${pkg}: 已安装`);
    } catch (e) {
      console.log(`❌ ${pkg}: 未安装或不可用`);
    }
  });
  
  optionalPackages.forEach(pkg => {
    try {
      require(pkg);
      console.log(`✅ ${pkg}: 已安装 (可选)`);
    } catch (e) {
      console.log(`⚪ ${pkg}: 未安装 (可选)`);
    }
  });
  
  console.log('');
}

// 检查日志文件格式
function checkLogFileFormat() {
  console.log('📄 检查日志文件格式:');
  
  const logDir = process.env.LOG_DIR || './logs';
  const fullPath = path.resolve(logDir);
  
  if (!fs.existsSync(fullPath)) {
    console.log('⚪ 日志目录不存在，跳过格式检查');
    console.log('');
    return;
  }
  
  const files = fs.readdirSync(fullPath).filter(file => file.endsWith('.log'));
  
  if (files.length === 0) {
    console.log('⚪ 暂无日志文件，跳过格式检查');
    console.log('');
    return;
  }
  
  let validFiles = 0;
  let invalidFiles = 0;
  
  files.slice(0, 3).forEach(file => {
    const filePath = path.join(fullPath, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        console.log(`⚪ ${file}: 空文件`);
        return;
      }
      
      let validLines = 0;
      let invalidLines = 0;
      
      lines.slice(0, 5).forEach(line => {
        try {
          const logEntry = JSON.parse(line);
          if (logEntry.timestamp && logEntry.level && logEntry.category && logEntry.message) {
            validLines++;
          } else {
            invalidLines++;
          }
        } catch (e) {
          invalidLines++;
        }
      });
      
      if (validLines > invalidLines) {
        console.log(`✅ ${file}: 格式正确 (${validLines}/${validLines + invalidLines} 行有效)`);
        validFiles++;
      } else {
        console.log(`❌ ${file}: 格式错误 (${validLines}/${validLines + invalidLines} 行有效)`);
        invalidFiles++;
      }
    } catch (e) {
      console.log(`❌ ${file}: 无法读取`);
      invalidFiles++;
    }
  });
  
  console.log(`\n📊 格式检查结果: ${validFiles} 个有效文件, ${invalidFiles} 个无效文件`);
  console.log('');
}

// 检查日志轮转配置
function checkLogRotation() {
  console.log('🔄 检查日志轮转配置:');
  
  const logDir = process.env.LOG_DIR || './logs';
  const fullPath = path.resolve(logDir);
  
  if (!fs.existsSync(fullPath)) {
    console.log('⚪ 日志目录不存在，跳过轮转检查');
    console.log('');
    return;
  }
  
  const maxFileSize = parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760');
  const maxFiles = parseInt(process.env.LOG_MAX_FILES || '5');
  
  console.log(`📏 最大文件大小: ${(maxFileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📁 最大文件数量: ${maxFiles}`);
  
  const files = fs.readdirSync(fullPath).filter(file => file.endsWith('.log'));
  const largeFiles = [];
  
  files.forEach(file => {
    const filePath = path.join(fullPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.size > maxFileSize * 0.8) { // 80% 阈值
      largeFiles.push({
        name: file,
        size: stat.size,
        percentage: (stat.size / maxFileSize * 100).toFixed(1)
      });
    }
  });
  
  if (largeFiles.length > 0) {
    console.log('⚠️  接近轮转阈值的文件:');
    largeFiles.forEach(file => {
      console.log(`   - ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)} MB (${file.percentage}%)`);
    });
  } else {
    console.log('✅ 所有文件大小正常');
  }
  
  console.log('');
}

// 生成配置建议
function generateRecommendations() {
  console.log('💡 配置建议:');
  
  const recommendations = [];
  
  // 检查日志目录
  const logDir = process.env.LOG_DIR || './logs';
  if (!fs.existsSync(path.resolve(logDir))) {
    recommendations.push('创建日志目录: mkdir -p logs');
  }
  
  // 检查环境变量
  if (!process.env.LOG_MAX_FILE_SIZE) {
    recommendations.push('设置日志文件大小限制: LOG_MAX_FILE_SIZE=10485760');
  }
  
  if (!process.env.LOG_MAX_FILES) {
    recommendations.push('设置日志文件数量限制: LOG_MAX_FILES=5');
  }
  
  // 检查Node.js环境
  if (!process.env.NODE_ENV) {
    recommendations.push('设置Node.js环境: NODE_ENV=development');
  }
  
  // 检查日志级别
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production' && !process.env.LOG_ENABLE_CONSOLE) {
    recommendations.push('生产环境建议禁用控制台输出: LOG_ENABLE_CONSOLE=false');
  }
  
  if (recommendations.length > 0) {
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  } else {
    console.log('✅ 配置看起来很好，无需额外建议');
  }
  
  console.log('');
}

// 主函数
function main() {
  checkLogDirectory();
  checkEnvironmentVariables();
  checkDependencies();
  checkLogFileFormat();
  checkLogRotation();
  generateRecommendations();
  
  console.log('🎉 日志系统配置检查完成！');
}

if (require.main === module) {
  main();
}
