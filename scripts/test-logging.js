#!/usr/bin/env node

/**
 * 日志系统测试脚本
 * 用于测试日志记录功能
 */

// 设置环境变量
process.env.NODE_ENV = 'development';
process.env.LOG_DIR = './logs';

// 由于这是TypeScript项目，我们需要使用不同的方式导入
// 这里我们直接测试日志功能而不依赖模块导入

console.log('🧪 开始测试日志系统...\n');

// 测试基础日志记录
console.log('1. 测试基础日志记录:');
logger.info(LogCategory.SYSTEM, '系统启动测试', { version: '1.0.0' });
logger.warn(LogCategory.SYSTEM, '这是一个警告消息', { component: 'test' });
logger.error(LogCategory.SYSTEM, '这是一个错误消息', { error: 'test error' });
logger.debug(LogCategory.SYSTEM, '这是调试信息', { debug: true });

// 测试用户行为日志
console.log('\n2. 测试用户行为日志:');
UserActivityLogger.logAuthentication(UserAction.LOGIN, true, {
  userId: 'test_user_123',
  ip: '192.168.1.100',
  userAgent: 'Test Agent'
});

UserActivityLogger.logFileOperation(UserAction.UPLOAD_FILE, 'test-image.jpg', 1024000, true, {
  userId: 'test_user_123',
  requestId: 'req_test_123'
});

UserActivityLogger.logImageTransform('ghibli', true, 3000, {
  userId: 'test_user_123',
  requestId: 'req_test_456'
});

// 测试性能日志
console.log('\n3. 测试性能日志:');
PerformanceLogger.logApiPerformance('POST', '/api/test', 1500, 200, 1024, 2048);
PerformanceLogger.logDatabasePerformance('findUser', 250, 'SELECT * FROM users', 'users', 1);
PerformanceLogger.logFileOperationPerformance('upload', 'test.jpg', 1024000, 2000, true);

// 测试性能测量
console.log('\n4. 测试性能测量:');
const result = PerformanceLogger.measurePerformanceSync(
  'test_operation',
  () => {
    // 模拟一些工作
    const start = Date.now();
    while (Date.now() - start < 100) {
      // 等待100ms
    }
    return 'test result';
  },
  'api',
  { test: true }
);

console.log('性能测量结果:', result);

// 测试不同级别的日志
console.log('\n5. 测试不同级别的日志:');
logger.setLogLevel(LogLevel.DEBUG);

logger.trace(LogCategory.API, '这是跟踪信息');
logger.debug(LogCategory.API, '这是调试信息');
logger.info(LogCategory.API, '这是信息日志');
logger.warn(LogCategory.API, '这是警告日志');
logger.error(LogCategory.API, '这是错误日志');

// 测试错误日志
console.log('\n6. 测试错误日志:');
try {
  throw new Error('测试错误');
} catch (error) {
  logger.logError(error, LogCategory.SYSTEM, {
    userId: 'test_user',
    requestId: 'req_error_test'
  });
}

// 测试安全日志
console.log('\n7. 测试安全日志:');
logger.logSecurity('suspicious_activity', {
  ip: '192.168.1.100',
  attempts: 5,
  reason: 'multiple_failed_logins'
});

// 测试配置
console.log('\n8. 测试配置:');
const config = logger.getConfig();
console.log('当前配置:', {
  logDir: config.logDir,
  logLevel: config.logLevel,
  enableConsole: config.enableConsole,
  enableFile: config.enableFile,
  maxFileSize: config.maxFileSize,
  maxFiles: config.maxFiles
});

console.log('\n✅ 日志系统测试完成！');
console.log('📁 请检查 logs/ 目录中的日志文件');
console.log('🔍 运行 "node scripts/log-manager.js analyze" 查看日志分析');
