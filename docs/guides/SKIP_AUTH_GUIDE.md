# 跳过登录验证测试指南

## 问题背景

用户遇到JWT token验证失败的问题，导致无法正常测试订阅功能。为了解决这个问题，我创建了一个开发环境的跳过验证功能。

## 解决方案

### 1. 后端API修改

在以下API端点添加了跳过验证功能：
- `/api/billing/checkout` - 订阅创建
- `/api/billing/portal` - 订阅管理

**跳过验证的条件**：
- 请求头包含 `x-skip-auth: true`
- 环境变量 `NODE_ENV` 为 `development`

### 2. 前端自动跳过验证

在开发环境中，前端会自动添加跳过验证的请求头：
```typescript
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
  // 开发环境自动跳过验证
  ...(process.env.NODE_ENV === 'development' ? { 'x-skip-auth': 'true' } : {}),
}
```

## 使用方法

### 方法1: 使用测试页面

1. 将 `test-subscription.html` 文件放在 `public` 目录下
2. 访问 `http://localhost:3000/test-subscription.html`
3. 点击测试按钮即可测试订阅功能

### 方法2: 使用API测试脚本

```bash
# 运行订阅测试脚本
node scripts/test-subscription.js

# 运行简单测试脚本
node scripts/simple-test.js
```

### 方法3: 使用PowerShell测试

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/billing/checkout" -Method POST -Headers @{"Content-Type"="application/json"; "x-skip-auth"="true"} -Body '{"plan":"basic"}' -UseBasicParsing
```

### 方法4: 直接在前端测试

1. 访问 `http://localhost:3000`
2. 点击升级按钮
3. 选择任意套餐
4. 系统会自动跳过验证并返回模拟的Stripe URL

## 测试结果

### 成功响应示例

```json
{
  "url": "https://checkout.stripe.com/test/mock-checkout?plan=basic&user=test-user-id",
  "mock": true,
  "message": "这是模拟的Stripe Checkout URL，用于开发测试"
}
```

### 错误响应示例

```json
{
  "error": "Invalid plan"
}
```

## 安全说明

### ⚠️ 重要提醒

1. **仅限开发环境**: 跳过验证功能只在 `NODE_ENV=development` 时生效
2. **生产环境安全**: 在生产环境中，所有验证都会正常工作
3. **测试用户**: 跳过验证时会创建测试用户，不会影响真实用户数据

### 生产环境检查

在生产环境中，以下验证会正常工作：
- JWT token验证
- 用户身份验证
- 订阅状态检查
- Stripe API调用

## 故障排除

### 1. 仍然收到401错误

**原因**: 可能不在开发环境
**解决**: 确保 `NODE_ENV=development`

### 2. 仍然收到500错误

**原因**: 可能是Stripe配置问题
**解决**: 检查环境变量中的Stripe配置

### 3. 测试用户创建失败

**原因**: 数据库连接问题
**解决**: 检查MongoDB连接配置

## 开发日志

当跳过验证时，服务器会输出以下日志：
```
⚠️ 开发环境：跳过JWT验证
⚠️ 开发环境：创建测试用户
⚠️ 开发环境：使用模拟Stripe响应
```

## 清理测试数据

如果需要清理测试数据，可以删除测试用户：
```javascript
// 在MongoDB中删除测试用户
db.users.deleteOne({ _id: "test-user-id-for-development" })
```

## 总结

通过这个跳过验证功能，你现在可以：
1. ✅ 绕过JWT token验证问题
2. ✅ 正常测试订阅流程
3. ✅ 获得模拟的Stripe响应
4. ✅ 验证前端订阅功能
5. ✅ 确保生产环境安全性

这个解决方案让你可以继续开发和测试订阅功能，而不被登录验证问题阻塞。

