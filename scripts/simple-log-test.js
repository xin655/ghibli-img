#!/usr/bin/env node

/**
 * 简单日志测试脚本
 * 测试日志文件创建和基本功能
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 开始简单日志测试...\n');

// 确保日志目录存在
const logDir = './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  console.log('✅ 创建日志目录:', logDir);
}

// 测试创建不同类型的日志文件
const testLogs = [
  {
    file: 'system-info-2024-12-19.log',
    content: {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category: 'SYSTEM',
      message: '系统启动测试',
      data: { version: '1.0.0', test: true }
    }
  },
  {
    file: 'api-info-2024-12-19.log',
    content: {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category: 'API',
      message: 'API请求测试',
      requestId: 'req_test_123',
      method: 'POST',
      url: '/api/test',
      duration: 1500
    }
  },
  {
    file: 'user-info-2024-12-19.log',
    content: {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category: 'USER',
      message: '用户行为测试',
      userId: 'test_user_123',
      action: 'login',
      success: true
    }
  },
  {
    file: 'performance-info-2024-12-19.log',
    content: {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category: 'PERFORMANCE',
      message: '性能测试',
      operation: 'test_operation',
      duration: 2500,
      success: true
    }
  },
  {
    file: 'security-warn-2024-12-19.log',
    content: {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      category: 'SECURITY',
      message: '安全事件测试',
      event: 'suspicious_activity',
      ip: '192.168.1.100',
      attempts: 3
    }
  }
];

// 创建测试日志文件
testLogs.forEach((testLog, index) => {
  const filePath = path.join(logDir, testLog.file);
  const logLine = JSON.stringify(testLog.content, null, 2) + '\n';
  
  try {
    fs.writeFileSync(filePath, logLine, 'utf8');
    console.log(`${index + 1}. ✅ 创建日志文件: ${testLog.file}`);
  } catch (error) {
    console.log(`${index + 1}. ❌ 创建日志文件失败: ${testLog.file} - ${error.message}`);
  }
});

// 测试日志轮转（创建大文件）
console.log('\n📦 测试日志轮转:');
const largeLogFile = path.join(logDir, 'large-test-2024-12-19.log');
let largeContent = '';

// 创建一个大文件（超过1MB）
for (let i = 0; i < 1000; i++) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    category: 'TEST',
    message: `测试日志条目 ${i}`,
    data: { index: i, largeData: 'x'.repeat(1000) }
  };
  largeContent += JSON.stringify(logEntry, null, 2) + '\n';
}

try {
  fs.writeFileSync(largeLogFile, largeContent, 'utf8');
  const stat = fs.statSync(largeLogFile);
  console.log(`✅ 创建大日志文件: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
} catch (error) {
  console.log(`❌ 创建大日志文件失败: ${error.message}`);
}

// 测试日志分析
console.log('\n📊 日志文件分析:');
const files = fs.readdirSync(logDir).filter(file => file.endsWith('.log'));
let totalSize = 0;

files.forEach(file => {
  const filePath = path.join(logDir, file);
  const stat = fs.statSync(filePath);
  totalSize += stat.size;
  const sizeKB = (stat.size / 1024).toFixed(2);
  console.log(`   - ${file}: ${sizeKB} KB`);
});

console.log(`\n📈 统计信息:`);
console.log(`   总文件数: ${files.length}`);
console.log(`   总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

// 测试日志搜索
console.log('\n🔍 测试日志搜索:');
const searchQuery = 'test';
let matchCount = 0;

files.forEach(file => {
  const filePath = path.join(logDir, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.toLowerCase().includes(searchQuery.toLowerCase())) {
      matchCount++;
      console.log(`   ✅ ${file}: 包含 "${searchQuery}"`);
    }
  } catch (error) {
    console.log(`   ❌ ${file}: 读取失败`);
  }
});

console.log(`\n🎯 搜索结果: 找到 ${matchCount} 个匹配文件`);

// 测试日志清理
console.log('\n🧹 测试日志清理:');
const testOldFile = path.join(logDir, 'old-test-2024-12-10.log');
const oldLogEntry = {
  timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10天前
  level: 'INFO',
  category: 'TEST',
  message: '旧测试日志'
};

try {
  fs.writeFileSync(testOldFile, JSON.stringify(oldLogEntry, null, 2) + '\n', 'utf8');
  console.log('✅ 创建旧日志文件用于测试清理');
  
  // 模拟清理（删除7天前的文件）
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  
  const stat = fs.statSync(testOldFile);
  if (stat.mtime < cutoffDate) {
    fs.unlinkSync(testOldFile);
    console.log('✅ 清理旧日志文件');
  } else {
    console.log('⚪ 文件不够旧，跳过清理');
  }
} catch (error) {
  console.log(`❌ 清理测试失败: ${error.message}`);
}

console.log('\n🎉 简单日志测试完成！');
console.log('📁 请检查 logs/ 目录中的日志文件');
console.log('🔍 运行 "node scripts/log-manager.js analyze" 查看详细分析');
