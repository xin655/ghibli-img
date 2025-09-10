# Windows Stripe订阅测试指南

## 🚀 快速开始

### 方法1: 使用批处理文件（推荐）

```cmd
# 快速测试
scripts\quick-test-windows.bat

# 完整测试
scripts\test-subscription-windows.bat lifecycle
```

### 方法2: 使用PowerShell脚本

```powershell
# 快速测试
.\scripts\test-subscription-windows.ps1 -EventType subscription-created

# 完整生命周期测试
.\scripts\test-subscription-windows.ps1 -Lifecycle
```

## 📋 可用的测试脚本

### 1. 快速测试脚本
**文件**: `scripts\quick-test-windows.bat`
**功能**: 快速发送3个基本事件
**使用方法**:
```cmd
scripts\quick-test-windows.bat
```

### 2. 完整测试脚本（批处理版本）
**文件**: `scripts\test-subscription-windows.bat`
**功能**: 完整的测试功能
**使用方法**:
```cmd
# 查看帮助
scripts\test-subscription-windows.bat

# 列出所有事件
scripts\test-subscription-windows.bat list

# 发送单个事件
scripts\test-subscription-windows.bat subscription-created

# 发送订阅生命周期事件
scripts\test-subscription-windows.bat lifecycle

# 发送支付相关事件
scripts\test-subscription-windows.bat payment

# 查看状态
scripts\test-subscription-windows.bat status
```

### 3. PowerShell脚本（功能最强大）
**文件**: `scripts\test-subscription-windows.ps1`
**功能**: 最完整的测试功能，支持参数
**使用方法**:
```powershell
# 查看帮助
.\scripts\test-subscription-windows.ps1 -Help

# 列出所有事件
.\scripts\test-subscription-windows.ps1 -List

# 发送单个事件
.\scripts\test-subscription-windows.ps1 -EventType subscription-created

# 发送订阅生命周期事件
.\scripts\test-subscription-windows.ps1 -Lifecycle

# 发送支付相关事件
.\scripts\test-subscription-windows.ps1 -Payment

# 查看状态
.\scripts\test-subscription-windows.ps1 -Status
```

## 🎯 测试事件类型

| 事件类型 | 描述 | Stripe命令 |
|---------|------|-----------|
| `subscription-created` | 订阅创建通知 | `stripe trigger customer.subscription.created` |
| `subscription-updated` | 订阅更新通知 | `stripe trigger customer.subscription.updated` |
| `subscription-cancelled` | 订阅取消通知 | `stripe trigger customer.subscription.deleted` |
| `payment-succeeded` | 支付成功通知 | `stripe trigger invoice.payment_succeeded` |
| `payment-failed` | 支付失败通知 | `stripe trigger invoice.payment_failed` |
| `checkout-completed` | 结账完成通知 | `stripe trigger checkout.session.completed` |

## 🔧 使用步骤

### 1. 准备工作
```cmd
# 确保Stripe CLI已安装
stripe --version

# 确保已登录
stripe login
```

### 2. 启动应用
```cmd
# 在一个终端中启动应用
npm run dev
```

### 3. 运行测试
```cmd
# 在另一个终端中运行测试
scripts\quick-test-windows.bat
```

### 4. 检查结果
```cmd
# 检查用户状态
node scripts\check-user-status.js
```

## 📊 预期结果

### 订阅创建成功后
- ✅ 订阅状态: `活跃`
- ✅ 订阅计划: `basic`/`pro`/`enterprise`
- ✅ 试用次数: 对应计划的次数
- ✅ 日志显示: `用户订阅状态已更新`

### 订阅取消后
- ✅ 订阅状态: `非活跃`
- ✅ 订阅计划: `free`
- ✅ 试用次数: `100` (免费用户)
- ✅ 日志显示: `订阅已取消`

## 🛠️ 故障排除

### 常见问题

1. **Stripe CLI未安装**
   ```cmd
   # 下载并安装Stripe CLI
   # 从 https://stripe.com/docs/stripe-cli 下载
   ```

2. **未登录Stripe**
   ```cmd
   stripe login
   ```

3. **PowerShell执行策略问题**
   ```powershell
   # 设置执行策略
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

4. **应用未运行**
   ```cmd
   npm run dev
   ```

### 调试技巧

1. **查看应用日志**
   - 检查运行 `npm run dev` 的终端
   - 查看webhook处理日志

2. **查看Stripe Dashboard**
   - 进入Webhooks页面
   - 查看事件日志

3. **手动检查用户状态**
   ```cmd
   node scripts\check-user-status.js
   ```

## 🎉 成功标志

当你看到以下输出时，说明测试成功：

```
✅ 用户 68bfc35e2c9a8cc9d8d876f6 订阅 basic 计划，试用次数更新为: 500
🎉 开发环境：用户 68bfc35e2c9a8cc9d8d876f6 订阅状态已更新为 basic
```

## 📚 相关文件

- `scripts\quick-test-windows.bat` - 快速测试脚本
- `scripts\test-subscription-windows.bat` - 完整测试脚本（批处理）
- `scripts\test-subscription-windows.ps1` - 完整测试脚本（PowerShell）
- `scripts\check-user-status.js` - 用户状态检查脚本
- `app\api\billing\webhook\route.ts` - webhook处理逻辑

## 🚀 快速命令参考

```cmd
# 最常用的命令
scripts\quick-test-windows.bat

# 完整生命周期测试
scripts\test-subscription-windows.bat lifecycle

# 检查用户状态
node scripts\check-user-status.js
```

现在你可以使用这些Windows脚本来测试Stripe订阅状态更新了！

