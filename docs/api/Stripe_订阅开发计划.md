# Stripe 订阅 - 详细开发计划（基于当前代码）

本计划仅实现“订阅能力接入”，不影响已完成的免费试用流程。采用 Next.js App Router + Stripe 后端 API + Webhook 最小闭环方案。

## 一、目标与范围

- 目标：实现从前端发起升级 → 跳转 Stripe 收银台 → Webhook 同步订阅状态 → 前端可进入 Portal 管理
- 范围：后端三条 API、Webhook 事件处理、User 模型扩展、前端最小接入

## 二、环境与配置

新增环境变量：

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_PRICE_ID_BASIC=price_123
STRIPE_PRICE_ID_PRO=price_456
STRIPE_PRICE_ID_ENTERPRISE=price_789
APP_BASE_URL=http://localhost:3000
```

## 三、数据模型改造

在 `app/models/User.ts` 中扩展 subscription（可选字段，避免破坏现有数据）：

```ts
subscription?: {
  plan?: 'free' | 'basic' | 'pro' | 'enterprise';
  isActive: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
};
```

注意：首次上线可仅保存 `isActive` 与 `plan`，其余字段后续补齐。

## 四、后端 API 与 Webhook

- 运行时均指定 `export const runtime = 'nodejs'`，避免部署到 Edge。
- 统一使用 JWT 验证当前用户身份。

### 1) 创建 Checkout Session
- 路由：`app/api/billing/checkout/route.ts`
- 方法：POST
- 入参：`{ plan: 'basic'|'pro'|'enterprise' }`
- 行为：
  - 若用户无 `stripeCustomerId`，通过 Stripe 创建
  - 使用对应 `PRICE_ID` 创建 `mode=subscription` 的 Checkout Session
  - `success_url` / `cancel_url` 返回站点
- 出参：`{ url: string }`

### 2) 创建 Billing Portal Session
- 路由：`app/api/billing/portal/route.ts`
- 方法：POST
- 行为：根据 `stripeCustomerId` 创建 Portal Session，返回 URL

### 3) Webhook 处理订阅生命周期
- 路由：`app/api/billing/webhook/route.ts`
- 方法：POST
- 行为：验签后处理以下事件并更新用户：
  - `checkout.session.completed` → 新订阅创建成功
  - `customer.subscription.updated` → 周期/状态更新
  - `customer.subscription.deleted` → 取消订阅
  - `invoice.payment_failed` → 标记为非活跃

## 五、前端接入点（与“前端接入流程”配套）

- 在升级模态框“选择此套餐”按钮中，调用 `/api/billing/checkout`
- 在头像菜单或设置页提供“管理订阅”按钮，调用 `/api/billing/portal`
- 在首页 `useEffect` 解析 `?billing=success|cancel` 进行轻提示

## 六、开发任务拆解与工期

按 5 天工作量预估：

Day 1
- [ ] 增加环境变量与本地配置
- [ ] User 模型扩展（subscription 可选字段）

Day 2
- [ ] 实现 `POST /api/billing/checkout`（含创建 customer）
- [ ] 计划内错误处理与日志

Day 3
- [ ] 实现 `POST /api/billing/portal`
- [ ] Stripe CLI 本地联调（Portal 跳转）

Day 4
- [ ] 实现 `POST /api/billing/webhook`
- [ ] 处理四类事件并落库
- [ ] CLI 触发事件联调：`invoice.payment_failed` 等

Day 5
- [ ] 前端接入（按钮绑定、提示、loading）
- [ ] 自测回归与文档完善

## 七、测试清单

- [ ] 创建/跳转 Checkout Session 成功
- [ ] 支付成功回站提示正确
- [ ] Webhook 收到并更新用户订阅状态
- [ ] 取消订阅 → isActive=false
- [ ] 支付失败 → isActive=false
- [ ] 进入 Portal 并返回站点

## 八、上线步骤

- [ ] 配置生产环境变量与真实 Price ID
- [ ] 在 Stripe Dashboard 配置生产 Webhook Endpoint
- [ ] 预发环境联调通过
- [ ] 正式发布与监控日志

## 九、运维与安全

- Webhook 必须验签，严禁跳过
- 仅在后端使用 Secret Key，前端只允许 Publishable Key
- 避免日志中输出敏感信息
- 出错时快速返回，避免 Webhook 超时

## 十、风险与回退

- Stripe 服务不可用：前端按钮降级为提示稍后再试
- Webhook 失败：重试与人工修复（Dashboard 查找对应 customer/subscription）
- DB 写入失败：记录错误日志与报警，人工补偿

---

本计划与《Stripe 订阅 - 前端接入流程》配套执行，可最小代价为现有应用提供可用的订阅能力。
