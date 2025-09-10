# 订阅试用次数更新逻辑完善指南

## 概述

我已经完善了订阅完成后的试用次数更新逻辑，确保用户订阅不同计划时能获得相应的使用次数。

## 实现的功能

### ✅ 1. 订阅成功时更新试用次数

**触发事件**: `checkout.session.completed`
**更新逻辑**:
- **基础套餐 (Basic)**: 500次转换
- **专业套餐 (Pro)**: 2000次转换  
- **企业套餐 (Enterprise)**: 无限制 (-1)

### ✅ 2. 订阅更新时保持试用次数

**触发事件**: `customer.subscription.updated`
**更新逻辑**: 当订阅变为活跃状态时，重新设置对应的试用次数

### ✅ 3. 订阅取消时恢复免费次数

**触发事件**: `customer.subscription.deleted`
**更新逻辑**: 恢复为免费用户的100次试用

### ✅ 4. 支付失败时恢复免费次数

**触发事件**: `invoice.payment_failed`
**更新逻辑**: 恢复为免费用户的100次试用

## 技术实现

### 核心函数

```javascript
function updateUserUsageForPlan(user, plan) {
  const planConfig = CONFIG.SUBSCRIPTION.PLANS[plan.toUpperCase()];
  
  if (planConfig) {
    if (planConfig.conversions === -1) {
      // 企业套餐：无限制
      user.usage.freeTrialsRemaining = -1;
    } else {
      // 基础套餐和专业套餐：设置对应的转换次数
      user.usage.freeTrialsRemaining = planConfig.conversions;
    }
    
    console.log(`✅ 用户 ${user._id} 订阅 ${plan} 计划，试用次数更新为: ${user.usage.freeTrialsRemaining}`);
  }
}
```

### 配置参数

```javascript
// app/config/constants.ts
SUBSCRIPTION: {
  PLANS: {
    BASIC: {
      name: '基础套餐',
      price: 9.99,
      conversions: 500,  // 500次转换
      features: ['标准分辨率', '历史保存', '邮件支持']
    },
    PRO: {
      name: '专业套餐', 
      price: 19.99,
      conversions: 2000, // 2000次转换
      features: ['高分辨率', '批量处理', '优先支持']
    },
    ENTERPRISE: {
      name: '企业套餐',
      price: 49.99,
      conversions: -1,   // 无限制
      features: ['最高分辨率', 'API访问', '定制开发']
    }
  }
}
```

## 更新流程

### 1. 用户订阅成功
```
用户点击订阅 → Stripe创建会话 → 用户完成支付 → 
Stripe发送webhook → 系统更新用户状态 → 设置对应试用次数
```

### 2. 订阅状态变化
```
订阅更新/取消/支付失败 → Stripe发送webhook → 
系统更新用户状态 → 相应调整试用次数
```

## 测试方法

### 1. 运行测试脚本
```bash
node scripts/test-usage-update.js
```

### 2. 手动测试流程
1. 使用测试模式登录
2. 点击订阅按钮
3. 完成支付流程
4. 检查用户试用次数是否更新

### 3. 检查数据库
```bash
node scripts/test-mongodb-users.js
```

## 日志记录

系统会记录以下日志：
- ✅ 订阅成功时的试用次数更新
- ⚠️ 订阅取消时的试用次数恢复
- ❌ 支付失败时的试用次数恢复

## 特殊情况处理

### 1. 企业套餐无限制
- `freeTrialsRemaining = -1` 表示无限制
- 前端需要特殊处理显示"无限制"

### 2. 订阅降级
- 如果用户从高级套餐降级到低级套餐，试用次数会相应减少
- 如果用户从付费套餐降级到免费，恢复100次试用

### 3. 订阅升级
- 试用次数会立即更新为新的套餐限制
- 不会累加，而是替换

## 前端集成

前端需要根据 `freeTrialsRemaining` 的值显示不同的状态：

```javascript
// 显示试用次数
if (userState.freeTrialsRemaining === -1) {
  return "无限制";
} else {
  return `剩余 ${userState.freeTrialsRemaining} 次`;
}
```

## 注意事项

1. **Webhook配置**: 确保Stripe webhook正确配置并指向你的服务器
2. **环境变量**: 确保 `STRIPE_WEBHOOK_SECRET` 正确配置
3. **数据库连接**: 确保MongoDB连接正常
4. **错误处理**: 所有更新操作都有错误处理和日志记录

## 验证清单

- [ ] 订阅成功后试用次数正确更新
- [ ] 订阅取消后试用次数正确恢复
- [ ] 支付失败后试用次数正确恢复
- [ ] 企业套餐显示无限制
- [ ] 日志记录完整
- [ ] 前端正确显示试用次数

## 下一步

1. 配置Stripe webhook端点
2. 测试完整的订阅流程
3. 验证试用次数更新
4. 确保前端正确显示状态

