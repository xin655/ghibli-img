# Stripe 订阅功能后端开发文档

## 项目概述

基于现有的 Next.js 15 + MongoDB + Stripe 技术栈，为 Ghibli 图片转换应用实现完整的订阅功能后端系统。当前项目已具备基础的 Stripe 集成，需要完善和优化订阅管理功能。

## 技术栈

- **框架**: Next.js 15 (App Router)
- **数据库**: MongoDB (Mongoose)
- **支付**: Stripe API
- **认证**: JWT + Google OAuth
- **语言**: TypeScript

## 当前实现状态

### ✅ 已完成功能
1. **基础 Stripe 集成**
   - Stripe SDK 已安装 (`stripe: ^18.5.0`)
   - 基础 API 路由已创建
   - 用户模型已包含订阅字段

2. **API 端点**
   - `POST /api/billing/checkout` - 创建订阅会话
   - `POST /api/billing/portal` - 客户门户管理
   - `POST /api/billing/webhook` - Webhook 事件处理

3. **数据模型**
   - User 模型包含完整的订阅字段
   - 支持多层级订阅计划 (free, basic, pro, enterprise)

### ⚠️ 需要改进的地方
1. **错误处理不够完善**
2. **缺少订阅状态验证中间件**
3. **Webhook 事件处理可以更全面**
4. **缺少订阅使用量统计**
5. **缺少订阅管理 API**

## 开发计划

### 阶段一：核心功能完善 (3-5天)

#### 1.1 环境配置优化
```typescript
// 环境变量配置
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_PRICE_ID_BASIC=price_xxx
STRIPE_PRICE_ID_PRO=price_xxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxx
APP_BASE_URL=http://localhost:3000
JWT_SECRET=your-secret-key
```

#### 1.2 数据模型创建
- 创建 `app/models/SubscriptionLog.ts` - 订阅操作日志
- 创建 `app/models/PaymentInfo.ts` - 支付信息记录
- 创建 `app/models/SubscriptionRecord.ts` - 订阅记录表
- 创建 `app/lib/services/LoggingService.ts` - 日志记录服务

#### 1.3 订阅状态验证中间件
创建 `app/middleware/subscription.ts`:
```typescript
export interface SubscriptionStatus {
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  isActive: boolean;
  canUseFeature: boolean;
  remainingUsage: number;
  maxUsage: number;
}

export async function validateSubscription(
  userId: string, 
  requiredPlan: string
): Promise<SubscriptionStatus>
```

#### 1.4 增强 Webhook 处理
扩展 `app/api/billing/webhook/route.ts`:
- 添加更多事件类型处理
- 改进错误处理和重试机制
- 集成日志记录服务
- 记录支付信息和订阅记录

#### 1.5 订阅管理 API
新增 `app/api/billing/subscription/route.ts`:
- `GET` - 获取用户订阅状态
- `PUT` - 更新订阅计划
- `DELETE` - 取消订阅

#### 1.6 日志查询 API
新增 `app/api/billing/logs/route.ts`:
- `GET` - 获取用户订阅日志
- `GET` - 获取支付历史
- `GET` - 获取订阅记录

### 阶段二：高级功能开发 (5-7天)

#### 2.1 使用量统计系统
创建 `app/models/Usage.ts`:
```typescript
interface IUsage {
  userId: ObjectId;
  date: Date;
  transformations: number;
  plan: string;
  remaining: number;
}
```

#### 2.2 订阅限制检查
创建 `app/lib/subscriptionLimits.ts`:
```typescript
export async function checkUsageLimit(
  userId: string, 
  operation: 'transform' | 'download'
): Promise<boolean>
```

#### 2.3 订阅升级/降级逻辑
创建 `app/api/billing/change-plan/route.ts`:
- 处理计划变更
- 计算按比例计费
- 更新用户权限

#### 2.4 发票和收据管理
创建 `app/api/billing/invoices/route.ts`:
- 获取用户发票历史
- 下载发票 PDF
- 处理发票争议

### 阶段三：监控和优化 (2-3天)

#### 3.1 订阅监控面板
创建 `app/api/admin/subscriptions/route.ts`:
- 订阅统计概览
- 收入分析
- 用户转化率

#### 3.2 自动化任务
创建 `app/lib/cronJobs.ts`:
- 订阅到期提醒
- 使用量重置
- 自动取消过期订阅

#### 3.3 性能优化
- 数据库查询优化
- 缓存策略
- API 响应时间优化

## 详细开发内容

### 1. 核心 API 增强

#### 1.1 订阅状态 API
```typescript
// app/api/billing/subscription/route.ts
export async function GET(req: Request) {
  // 获取用户完整订阅信息
  // 包括使用量、限制、到期时间等
}

export async function PUT(req: Request) {
  // 更新订阅计划
  // 处理升级/降级逻辑
}
```

#### 1.2 使用量检查 API
```typescript
// app/api/billing/usage/route.ts
export async function GET(req: Request) {
  // 获取当前使用量统计
}

export async function POST(req: Request) {
  // 记录使用量
  // 检查是否超出限制
}
```

#### 1.3 订阅历史 API
```typescript
// app/api/billing/history/route.ts
export async function GET(req: Request) {
  // 获取订阅变更历史
  // 包括升级、降级、取消等记录
}
```

### 2. 数据模型扩展

#### 2.1 用户模型增强
```typescript
// app/models/User.ts 扩展
subscription: {
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  isActive: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  usage: {
    currentPeriod: {
      transformations: number;
      downloads: number;
      startDate: Date;
      endDate: Date;
    };
    limits: {
      maxTransformations: number;
      maxDownloads: number;
      maxFileSize: number;
    };
  };
}
```

#### 2.2 新增使用量模型
```typescript
// app/models/Usage.ts
interface IUsage {
  userId: ObjectId;
  date: Date;
  operation: 'transform' | 'download' | 'upload';
  count: number;
  plan: string;
  metadata?: Record<string, any>;
}
```

#### 2.3 订阅日志记录模型
```typescript
// app/models/SubscriptionLog.ts
interface ISubscriptionLogDocument {
  _id: ObjectId;
  userId: ObjectId;
  subscriptionId?: string;
  action: 'created' | 'updated' | 'cancelled' | 'reactivated' | 'expired' | 'payment_failed' | 'payment_succeeded' | 'trial_started' | 'trial_ended';
  fromPlan?: 'free' | 'basic' | 'pro' | 'enterprise';
  toPlan?: 'free' | 'basic' | 'pro' | 'enterprise';
  stripeEventId?: string;
  stripeEventType?: string;
  amount?: number;
  currency?: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2.4 支付信息模型
```typescript
// app/models/PaymentInfo.ts
interface IPaymentInfoDocument {
  _id: ObjectId;
  userId: ObjectId;
  subscriptionId?: string;
  paymentIntentId?: string;
  invoiceId?: string;
  chargeId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
  paymentMethod: {
    type: 'card' | 'bank_account' | 'paypal' | 'alipay' | 'wechat_pay';
    last4?: string;
    brand?: string;
    expMonth?: number;
    expYear?: number;
    country?: string;
  };
  billingDetails: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  description?: string;
  receiptUrl?: string;
  refundedAmount?: number;
  refundReason?: string;
  failureCode?: string;
  failureMessage?: string;
  metadata?: Record<string, any>;
  stripeData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  refundedAt?: Date;
}
```

#### 2.5 订阅记录模型
```typescript
// app/models/SubscriptionRecord.ts
interface ISubscriptionRecordDocument {
  _id: ObjectId;
  userId: ObjectId;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  endedAt?: Date;
  priceId: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  quantity: number;
  metadata?: Record<string, any>;
  stripeData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}
```

### 3. 业务逻辑层

#### 3.1 订阅服务
```typescript
// app/lib/services/SubscriptionService.ts
export class SubscriptionService {
  async createSubscription(userId: string, plan: string): Promise<Subscription>
  async updateSubscription(subscriptionId: string, plan: string): Promise<Subscription>
  async cancelSubscription(subscriptionId: string): Promise<void>
  async checkUsageLimit(userId: string, operation: string): Promise<boolean>
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus>
}
```

#### 3.2 使用量服务
```typescript
// app/lib/services/UsageService.ts
export class UsageService {
  async recordUsage(userId: string, operation: string, metadata?: any): Promise<void>
  async getCurrentUsage(userId: string): Promise<UsageStats>
  async resetMonthlyUsage(userId: string): Promise<void>
  async checkLimit(userId: string, operation: string): Promise<boolean>
}
```

#### 3.3 日志记录服务
```typescript
// app/lib/services/LoggingService.ts
export class LoggingService {
  // 记录订阅操作日志
  static async logSubscription(params: LogSubscriptionParams): Promise<void>
  
  // 记录支付信息
  static async logPayment(params: LogPaymentParams): Promise<void>
  
  // 记录订阅记录
  static async logSubscriptionRecord(params: LogSubscriptionRecordParams): Promise<void>
  
  // 获取用户订阅日志
  static async getUserSubscriptionLogs(userId: string, limit?: number, offset?: number): Promise<any[]>
  
  // 获取用户支付历史
  static async getUserPaymentHistory(userId: string, limit?: number, offset?: number): Promise<any[]>
  
  // 获取用户订阅记录
  static async getUserSubscriptionRecords(userId: string): Promise<any[]>
  
  // 获取订阅统计信息
  static async getSubscriptionStats(userId: string): Promise<SubscriptionStats>
}
```

#### 3.4 通知服务
```typescript
// app/lib/services/NotificationService.ts
export class NotificationService {
  async sendSubscriptionExpiryWarning(userId: string, daysLeft: number): Promise<void>
  async sendUsageLimitWarning(userId: string, percentage: number): Promise<void>
  async sendPaymentFailedNotification(userId: string): Promise<void>
}
```

### 4. 中间件和工具

#### 4.1 订阅验证中间件
```typescript
// app/middleware/subscription.ts
export function requireSubscription(requiredPlan: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 验证用户订阅状态
    // 检查计划权限
    // 验证使用量限制
  }
}
```

#### 4.2 使用量记录中间件
```typescript
// app/middleware/usage.ts
export function trackUsage(operation: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 记录使用量
    // 检查限制
    // 更新统计
  }
}
```

#### 4.3 错误处理工具
```typescript
// app/lib/errors/SubscriptionErrors.ts
export class SubscriptionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export class UsageLimitExceededError extends SubscriptionError {
  constructor(operation: string, limit: number) {
    super(`Usage limit exceeded for ${operation}`, 'USAGE_LIMIT_EXCEEDED');
  }
}
```

## 开发时间线

### 第1周：基础功能完善
- **Day 1-2**: 环境配置和中间件开发
- **Day 3-4**: API 增强和错误处理
- **Day 5**: 测试和调试

### 第2周：高级功能开发
- **Day 1-2**: 使用量统计系统
- **Day 3-4**: 订阅管理功能
- **Day 5**: 发票和收据管理

### 第3周：监控和优化
- **Day 1-2**: 监控面板和自动化任务
- **Day 3**: 性能优化和测试
- **Day 4-5**: 文档完善和部署

## 测试策略

### 1. 单元测试
- 订阅服务逻辑测试
- 使用量计算测试
- 错误处理测试

### 2. 集成测试
- Stripe API 集成测试
- 数据库操作测试
- Webhook 事件处理测试

### 3. 端到端测试
- 完整订阅流程测试
- 使用量限制测试
- 订阅管理功能测试

## 部署和监控

### 1. 环境配置
- 开发环境：使用 Stripe 测试模式
- 预发环境：使用 Stripe 测试模式 + 真实数据库
- 生产环境：使用 Stripe 生产模式

### 2. 监控指标
- 订阅转化率
- 收入统计
- API 响应时间
- 错误率统计

### 3. 日志记录
- 订阅操作日志
- 使用量记录日志
- 错误和异常日志
- 性能监控日志

## 安全考虑

### 1. 数据安全
- 敏感信息加密存储
- API 密钥安全管理
- 用户数据隐私保护

### 2. 支付安全
- Stripe Webhook 签名验证
- 支付信息不存储本地
- 定期安全审计

### 3. 访问控制
- JWT 令牌验证
- 订阅权限检查
- 使用量限制验证

## 维护和扩展

### 1. 定期维护
- 订阅状态同步检查
- 使用量数据清理
- 性能监控和优化

### 2. 功能扩展
- 新订阅计划添加
- 高级分析功能
- 第三方集成

### 3. 故障处理
- 自动重试机制
- 人工干预流程
- 数据恢复方案

---

本开发文档基于当前代码结构，提供了完整的 Stripe 订阅功能后端开发指南。通过分阶段实施，可以确保功能的稳定性和可维护性。
