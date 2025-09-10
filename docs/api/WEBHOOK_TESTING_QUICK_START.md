# Stripe Webhook测试快速开始

## 🚀 快速测试（推荐）

### 1. 使用Stripe CLI快速测试

```bash
# 快速测试webhook事件
npm run test:webhook
```

这个命令会：
- 检查Stripe CLI是否安装
- 检查是否已登录Stripe
- 自动触发测试事件
- 显示测试结果

### 2. 检查用户状态

```bash
# 检查用户订阅状态和试用次数
npm run test:user-status
```

## 🔧 详细测试方法

### 方法1: 使用Stripe CLI监听器

```bash
# 启动webhook监听器（需要两个终端）
# 终端1: 启动应用
npm run dev

# 终端2: 启动webhook监听器
npm run test:webhook:listen
```

然后在第三个终端中触发事件：
```bash
# 触发订阅成功事件
stripe trigger checkout.session.completed

# 触发订阅更新事件
stripe trigger customer.subscription.updated

# 触发订阅取消事件
stripe trigger customer.subscription.deleted
```

### 方法2: 使用模拟webhook

```bash
# 运行完整的模拟测试流程
npm run test:webhook:simulate
```

### 方法3: 测试试用次数更新逻辑

```bash
# 测试试用次数更新逻辑
npm run test:usage-update
```

## 📋 可用的npm脚本

| 脚本 | 描述 |
|------|------|
| `npm run test:webhook` | 快速Stripe webhook测试 |
| `npm run test:webhook:listen` | 启动Stripe CLI监听器 |
| `npm run test:webhook:simulate` | 运行模拟webhook测试 |
| `npm run test:user-status` | 检查用户状态 |
| `npm run test:usage-update` | 测试试用次数更新逻辑 |

## 🎯 测试流程

### 完整测试流程

1. **启动应用**:
   ```bash
   npm run dev
   ```

2. **快速测试webhook**:
   ```bash
   npm run test:webhook
   ```

3. **检查用户状态**:
   ```bash
   npm run test:user-status
   ```

4. **验证结果**:
   - 订阅状态应该更新为活跃
   - 试用次数应该更新为对应计划的数量
   - 应该看到相关的日志输出

### 手动测试流程

1. **使用测试模式登录**:
   - 访问 `http://localhost:3000/login`
   - 点击"或使用测试模式登录"

2. **触发订阅**:
   - 点击任意订阅计划
   - 完成支付流程

3. **发送webhook事件**:
   ```bash
   stripe trigger checkout.session.completed
   ```

4. **检查状态更新**:
   ```bash
   npm run test:user-status
   ```

## 🔍 预期结果

### 订阅成功后
- ✅ 订阅计划: `basic`/`pro`/`enterprise`
- ✅ 订阅状态: `活跃`
- ✅ 试用次数: 对应计划的次数
- ✅ Stripe客户ID和订阅ID已设置

### 订阅取消后
- ✅ 订阅计划: `free`
- ✅ 订阅状态: `非活跃`
- ✅ 试用次数: `100` (免费用户)

## 🛠️ 故障排除

### 常见问题

1. **Stripe CLI未安装**:
   ```bash
   # 下载并安装Stripe CLI
   # 从 https://stripe.com/docs/stripe-cli 下载
   ```

2. **未登录Stripe**:
   ```bash
   stripe login
   ```

3. **应用未运行**:
   ```bash
   npm run dev
   ```

4. **webhook端点不可达**:
   - 确保应用在localhost:3000运行
   - 检查防火墙设置

### 调试技巧

1. **查看应用日志**:
   - 检查终端中的服务器日志
   - 查看webhook处理日志

2. **查看Stripe Dashboard**:
   - 进入Webhooks页面
   - 查看事件日志

3. **使用Stripe CLI日志**:
   ```bash
   stripe logs tail
   ```

## 📚 相关文档

- `STRIPE_WEBHOOK_TESTING_GUIDE.md` - 详细的webhook测试指南
- `SUBSCRIPTION_STATUS_UPDATE_FIX.md` - 订阅状态更新修复说明
- `SUBSCRIPTION_USAGE_UPDATE_GUIDE.md` - 试用次数更新指南

## 🎉 成功标志

当你看到以下日志输出时，说明webhook测试成功：

```
✅ 用户 68bfc35e2c9a8cc9d8d876f6 订阅 basic 计划，试用次数更新为: 500
🎉 开发环境：用户 68bfc35e2c9a8cc9d8d876f6 订阅状态已更新为 basic
```

现在你可以开始测试Stripe webhook功能了！

