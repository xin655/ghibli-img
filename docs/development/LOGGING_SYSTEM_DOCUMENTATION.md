# Ghibli Dreamer 日志管理系统文档

## 📋 系统概述

Ghibli Dreamer 项目实现了一套完整的日志管理系统，用于记录错误信息、用户行为、API调用、性能指标等关键数据。系统采用分级存储、自动轮转、结构化日志等先进特性，确保系统可观测性和问题诊断能力。

## 🏗️ 系统架构

### 核心组件

1. **Logger** - 核心日志记录器
2. **ApiLogger** - API请求日志中间件
3. **UserActivityLogger** - 用户行为日志记录器
4. **PerformanceLogger** - 性能监控日志记录器

### 日志分类

- **API** - API请求和响应日志
- **AUTH** - 认证相关日志
- **BILLING** - 订阅和支付日志
- **UPLOAD** - 文件上传日志
- **TRANSFORM** - 图片转换日志
- **USER** - 用户行为日志
- **SYSTEM** - 系统级日志
- **SECURITY** - 安全事件日志
- **PERFORMANCE** - 性能监控日志

## 📊 日志级别

### 级别定义

| 级别 | 描述 | 使用场景 |
|------|------|----------|
| **ERROR** | 错误 | 系统错误、异常、失败操作 |
| **WARN** | 警告 | 潜在问题、性能问题、安全警告 |
| **INFO** | 信息 | 正常操作、用户行为、系统状态 |
| **DEBUG** | 调试 | 开发调试信息、详细执行流程 |
| **TRACE** | 跟踪 | 最详细的执行跟踪信息 |

### 级别配置

```typescript
// 环境变量配置
NODE_ENV=development  // DEBUG 级别
NODE_ENV=production   // INFO 级别
NODE_ENV=test         // WARN 级别
```

## 📁 日志存储结构

### 文件命名规则

```
logs/
├── api-info-2024-12-19.log
├── api-error-2024-12-19.log
├── auth-info-2024-12-19.log
├── auth-error-2024-12-19.log
├── billing-info-2024-12-19.log
├── billing-error-2024-12-19.log
├── upload-info-2024-12-19.log
├── upload-error-2024-12-19.log
├── transform-info-2024-12-19.log
├── transform-error-2024-12-19.log
├── user-info-2024-12-19.log
├── user-error-2024-12-19.log
├── system-info-2024-12-19.log
├── system-error-2024-12-19.log
├── security-warn-2024-12-19.log
└── performance-info-2024-12-19.log
```

### 日志轮转策略

- **文件大小限制**: 10MB (可配置)
- **保留文件数**: 5个 (可配置)
- **轮转方式**: 按大小自动轮转
- **压缩**: 支持 (可选)

## 🔧 配置选项

### 环境变量

```env
# 日志目录
LOG_DIR=./logs

# 文件大小限制 (字节)
LOG_MAX_FILE_SIZE=10485760

# 保留文件数
LOG_MAX_FILES=5

# 控制台输出
LOG_ENABLE_CONSOLE=true

# 文件输出
LOG_ENABLE_FILE=true

# 日期格式
LOG_DATE_PATTERN=YYYY-MM-DD
```

### 代码配置

```typescript
import { logger } from '@/app/lib/logger';

// 设置日志级别
logger.setLogLevel(LogLevel.DEBUG);

// 更新配置
logger.setConfig({
  logDir: './custom-logs',
  maxFileSize: 20 * 1024 * 1024, // 20MB
  maxFiles: 10,
  enableConsole: true,
  enableFile: true
});
```

## 📝 日志格式

### 结构化日志格式

```json
{
  "timestamp": "2024-12-19T10:30:00.000Z",
  "level": "INFO",
  "category": "API",
  "message": "Request started: POST /api/upload",
  "requestId": "req_123456789",
  "userId": "user_123",
  "sessionId": "session_456",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "data": {
    "method": "POST",
    "url": "/api/upload",
    "headers": {
      "content-type": "multipart/form-data",
      "authorization": "[REDACTED]"
    }
  },
  "metadata": {
    "fileSize": 1024000,
    "fileName": "image.jpg"
  }
}
```

### 控制台输出格式

```
[2024-12-19T10:30:00.000Z] INFO [API] Request started: POST /api/upload
Data: { method: "POST", url: "/api/upload", requestId: "req_123456789" }
```

## 🚀 使用指南

### 1. 基础日志记录

```typescript
import { logger, LogCategory, LogLevel } from '@/app/lib/logger';

// 记录信息日志
logger.info(LogCategory.API, 'User logged in successfully', {
  userId: 'user_123',
  loginMethod: 'google'
});

// 记录错误日志
logger.error(LogCategory.SYSTEM, 'Database connection failed', {
  error: 'Connection timeout',
  retryCount: 3
});

// 记录警告日志
logger.warn(LogCategory.SECURITY, 'Suspicious login attempt', {
  ip: '192.168.1.100',
  attempts: 5
});
```

### 2. API日志记录

```typescript
import { withApiLogging, ApiLogger } from '@/app/lib/logger';

// 包装API路由
export const POST = withApiLogging(async (req: Request) => {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  
  try {
    // API逻辑
    const result = await processRequest(req);
    
    // 记录成功
    ApiLogger.logApiSuccess(requestId, 'Request processed successfully', {
      resultCount: result.length
    });
    
    return NextResponse.json(result);
  } catch (error) {
    // 记录错误
    ApiLogger.logApiError(requestId, error as Error);
    throw error;
  }
});
```

### 3. 用户行为日志

```typescript
import { UserActivityLogger, UserAction } from '@/app/lib/logger';

// 记录用户登录
UserActivityLogger.logAuthentication(
  UserAction.LOGIN,
  true, // 成功
  {
    userId: 'user_123',
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0...'
  }
);

// 记录文件上传
UserActivityLogger.logFileOperation(
  UserAction.UPLOAD_FILE,
  'image.jpg',
  1024000, // 文件大小
  true, // 成功
  {
    userId: 'user_123',
    requestId: 'req_456'
  }
);

// 记录图片转换
UserActivityLogger.logImageTransform(
  'ghibli',
  true, // 成功
  5000, // 耗时5秒
  {
    userId: 'user_123',
    requestId: 'req_789'
  }
);
```

### 4. 性能监控日志

```typescript
import { PerformanceLogger } from '@/app/lib/logger';

// 监控API性能
PerformanceLogger.logApiPerformance(
  'POST',
  '/api/upload',
  1500, // 耗时1.5秒
  200, // 状态码
  1024000, // 请求大小
  2048 // 响应大小
);

// 监控数据库性能
PerformanceLogger.logDatabasePerformance(
  'findUser',
  250, // 耗时250ms
  'SELECT * FROM users WHERE id = ?',
  'users',
  1 // 影响行数
);

// 监控文件操作性能
PerformanceLogger.logFileOperationPerformance(
  'upload',
  'image.jpg',
  1024000, // 文件大小
  2000, // 耗时2秒
  true // 成功
);

// 使用测量装饰器
const result = await PerformanceLogger.measurePerformance(
  'complex_operation',
  async () => {
    return await performComplexOperation();
  },
  'api',
  { operationType: 'batch' }
);
```

## 📊 监控和告警

### 关键指标

1. **错误率**: ERROR级别日志数量
2. **响应时间**: API请求耗时
3. **用户活跃度**: 用户行为日志数量
4. **系统性能**: 慢查询、慢操作
5. **安全事件**: 异常登录、权限问题

### 告警规则

```typescript
// 错误率告警
if (errorCount > 10) {
  logger.warn(LogCategory.SYSTEM, 'High error rate detected', {
    errorCount,
    timeWindow: '5 minutes'
  });
}

// 性能告警
if (avgResponseTime > 5000) {
  logger.warn(LogCategory.PERFORMANCE, 'Slow response time detected', {
    avgResponseTime,
    threshold: 5000
  });
}
```

## 🔍 日志分析

### 查询示例

```bash
# 查看错误日志
grep '"level":"ERROR"' logs/*.log

# 查看特定用户的日志
grep '"userId":"user_123"' logs/*.log

# 查看API请求日志
grep '"category":"API"' logs/*.log

# 查看性能问题
grep '"duration":[5-9][0-9][0-9][0-9]' logs/performance-*.log
```

### 日志聚合

```typescript
// 按小时聚合错误日志
const hourlyErrors = await aggregateLogs({
  level: LogLevel.ERROR,
  groupBy: 'hour',
  timeRange: '24h'
});

// 按用户聚合行为日志
const userActivity = await aggregateLogs({
  category: LogCategory.USER,
  groupBy: 'userId',
  timeRange: '7d'
});
```

## 🛠️ 维护和优化

### 日志清理

```bash
# 清理7天前的日志
find logs/ -name "*.log" -mtime +7 -delete

# 压缩旧日志
gzip logs/*.log.1 logs/*.log.2
```

### 性能优化

1. **异步写入**: 日志写入不阻塞主线程
2. **批量写入**: 合并多个日志条目
3. **压缩存储**: 压缩历史日志文件
4. **索引优化**: 为常用查询字段建立索引

### 安全考虑

1. **敏感信息脱敏**: 自动脱敏密码、token等
2. **访问控制**: 限制日志文件访问权限
3. **加密存储**: 敏感日志加密存储
4. **审计日志**: 记录日志访问行为

## 📈 扩展功能

### 日志转发

```typescript
// 转发到外部系统
const logForwarder = {
  async forward(logEntry: LogEntry) {
    // 发送到ELK Stack
    await sendToElasticsearch(logEntry);
    
    // 发送到Splunk
    await sendToSplunk(logEntry);
    
    // 发送到Datadog
    await sendToDatadog(logEntry);
  }
};
```

### 实时监控

```typescript
// WebSocket实时日志推送
const logStream = new EventSource('/api/logs/stream');
logStream.onmessage = (event) => {
  const logEntry = JSON.parse(event.data);
  updateLogDashboard(logEntry);
};
```

## 🎯 最佳实践

### 1. 日志内容规范

- **结构化**: 使用JSON格式，便于解析
- **上下文**: 包含足够的上下文信息
- **一致性**: 保持日志格式的一致性
- **可读性**: 日志消息清晰易懂

### 2. 性能考虑

- **异步记录**: 避免阻塞主业务逻辑
- **批量处理**: 合并多个日志条目
- **级别控制**: 生产环境使用合适的日志级别
- **存储优化**: 定期清理和压缩日志

### 3. 安全要求

- **敏感信息**: 自动脱敏敏感数据
- **访问控制**: 限制日志文件访问权限
- **审计跟踪**: 记录日志访问行为
- **合规性**: 满足数据保护法规要求

## 📋 总结

Ghibli Dreamer 日志管理系统提供了完整的可观测性解决方案，包括：

✅ **多级日志记录**: 支持ERROR、WARN、INFO、DEBUG、TRACE五个级别
✅ **分类存储**: 按功能模块分类存储日志文件
✅ **自动轮转**: 基于文件大小自动轮转和清理
✅ **性能监控**: 详细的性能指标记录和分析
✅ **用户行为跟踪**: 完整的用户操作记录
✅ **API监控**: 全面的API请求和响应日志
✅ **安全审计**: 安全事件和异常行为记录
✅ **结构化格式**: JSON格式便于解析和分析
✅ **环境适配**: 根据环境自动调整日志级别
✅ **扩展性**: 支持日志转发和外部系统集成

通过这套日志管理系统，开发团队可以快速定位问题、监控系统性能、分析用户行为，为系统的稳定运行和持续优化提供强有力的支持。
