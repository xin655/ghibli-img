# Stripe Webhook测试指南

## 概述

本指南提供了多种方法来测试Stripe webhook事件，确保订阅状态更新逻辑正常工作。

## 方法1: 使用Stripe CLI监听器（推荐）

### 1. 安装和配置Stripe CLI

```bash
# 下载并安装Stripe CLI
# Windows: 从 https://stripe.com/docs/stripe-cli 下载
# 或使用包管理器安装

# 登录Stripe账户
stripe login
```

### 2. 启动webhook监听器

```bash
# 启动监听器，转发webhook到本地服务器
node scripts/stripe-listen.js
```

### 3. 触发测试事件

在另一个终端中运行以下命令：

```bash
# 模拟订阅成功
stripe trigger checkout.session.completed

# 模拟订阅创建
stripe trigger customer.subscription.created

# 模拟订阅更新
stripe trigger customer.subscription.updated

# 模拟订阅取消
stripe trigger customer.subscription.deleted

# 模拟支付成功
stripe trigger invoice.payment_succeeded

# 模拟支付失败
stripe trigger invoice.payment_failed
```

## 方法2: 使用Stripe CLI测试脚本

### 1. 运行测试脚本

```bash
# 查看可用的事件类型
node scripts/stripe-webhook-test.js list

# 测试单个事件
node scripts/stripe-webhook-test.js checkout.session.completed

# 测试所有事件
node scripts/stripe-webhook-test.js all
```

### 2. 可用的测试事件

- `checkout.session.completed` - 订阅成功
- `customer.subscription.created` - 订阅创建
- `customer.subscription.updated` - 订阅更新
- `customer.subscription.deleted` - 订阅取消
- `invoice.payment_succeeded` - 支付成功
- `invoice.payment_failed` - 支付失败

## 方法3: 使用模拟webhook脚本

### 1. 运行模拟脚本

```bash
# 运行完整的webhook测试流程
node scripts/simulate-stripe-webhook.js
```

### 2. 测试流程

脚本会自动执行以下步骤：
1. 检查初始用户状态
2. 模拟订阅成功事件
3. 检查订阅成功后的状态
4. 模拟订阅更新事件
5. 检查订阅更新后的状态
6. 模拟订阅取消事件
7. 检查订阅取消后的状态

## 方法4: 手动检查用户状态

### 1. 检查用户状态

```bash
# 检查当前用户状态
node scripts/check-user-status.js
```

### 2. 预期结果

**订阅成功后**:
- 订阅计划: `basic`/`pro`/`enterprise`
- 订阅状态: `活跃`
- 试用次数: 对应计划的次数

**订阅取消后**:
- 订阅计划: `free`
- 订阅状态: `非活跃`
- 试用次数: `100` (免费用户)

## 测试步骤

### 完整测试流程

1. **启动应用**:
   ```bash
   npm run dev
   ```

2. **启动webhook监听器**:
   ```bash
   node scripts/stripe-listen.js
   ```

3. **使用测试模式登录**:
   - 访问 `http://localhost:3000/login`
   - 点击"或使用测试模式登录"

4. **触发订阅**:
   - 点击任意订阅计划
   - 完成支付流程

5. **发送webhook事件**:
   ```bash
   stripe trigger checkout.session.completed
   ```

6. **检查状态更新**:
   ```bash
   node scripts/check-user-status.js
   ```

## 故障排除

### 常见问题

1. **Stripe CLI未安装**:
   ```bash
   # 下载并安装Stripe CLI
   # 确保在系统PATH中
   stripe --version
   ```

2. **未登录Stripe**:
   ```bash
   stripe login
   ```

3. **webhook端点不可达**:
   - 确保应用正在运行
   - 检查端口3000是否可用
   - 检查防火墙设置

4. **webhook签名验证失败**:
   - 确保设置了正确的webhook密钥
   - 检查环境变量配置

### 调试技巧

1. **查看应用日志**:
   - 检查终端中的服务器日志
   - 查看webhook处理日志

2. **查看Stripe Dashboard**:
   - 进入Webhooks页面
   - 查看事件日志
   - 检查事件状态

3. **使用Stripe CLI日志**:
   ```bash
   stripe logs tail
   ```

## 环境变量配置

确保以下环境变量正确配置：

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/testdb
```

## 预期行为

### 订阅成功时
- ✅ 用户订阅状态更新为活跃
- ✅ 订阅计划设置为选择的计划
- ✅ 试用次数更新为对应计划的数量
- ✅ 记录订阅日志

### 订阅取消时
- ✅ 用户订阅状态更新为非活跃
- ✅ 试用次数恢复为免费用户数量
- ✅ 记录取消日志

### 支付失败时
- ✅ 用户订阅状态更新为非活跃
- ✅ 试用次数恢复为免费用户数量
- ✅ 记录失败日志

## 相关文件

- `scripts/stripe-listen.js` - Stripe CLI监听器
- `scripts/stripe-webhook-test.js` - Stripe CLI测试脚本
- `scripts/simulate-stripe-webhook.js` - 模拟webhook脚本
- `scripts/check-user-status.js` - 用户状态检查脚本
- `app/api/billing/webhook/route.ts` - webhook处理逻辑

