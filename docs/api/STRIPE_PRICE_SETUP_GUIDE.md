# Stripe价格设置指南

## 问题说明

当前代码中使用的Stripe价格ID无效，导致订阅功能无法正常工作。你需要创建有效的Stripe价格。

## 解决方案

### 方法1：创建真实的Stripe价格（推荐用于生产环境）

#### 步骤1：登录Stripe Dashboard
1. 访问 [Stripe Dashboard](https://dashboard.stripe.com)
2. 使用你的Stripe账户登录
3. 确保你在**测试模式**（Test mode）

#### 步骤2：创建产品
1. 在左侧菜单中点击 **Products**
2. 点击 **Add product** 按钮
3. 填写产品信息：
   - **Name**: Ghibli Image Transform - Basic Plan
   - **Description**: 基础订阅计划，包含图像转换功能
4. 点击 **Save product**

#### 步骤3：为每个计划创建价格
为每个订阅计划创建价格：

**Basic Plan:**
- **Pricing model**: Standard pricing
- **Price**: $9.99
- **Billing period**: Monthly
- **Currency**: USD
- 点击 **Save price**
- 复制生成的价格ID（格式：`price_xxxxx`）

**Pro Plan:**
- **Pricing model**: Standard pricing  
- **Price**: $19.99
- **Billing period**: Monthly
- **Currency**: USD
- 点击 **Save price**
- 复制生成的价格ID

**Enterprise Plan:**
- **Pricing model**: Standard pricing
- **Price**: $49.99
- **Billing period**: Monthly
- **Currency**: USD
- 点击 **Save price**
- 复制生成的价格ID

#### 步骤4：更新环境变量
将生成的价格ID更新到 `.env.local` 文件中：

```env
STRIPE_PRICE_ID_BASIC=price_你的Basic价格ID
STRIPE_PRICE_ID_PRO=price_你的Pro价格ID
STRIPE_PRICE_ID_ENTERPRISE=price_你的Enterprise价格ID
```

### 方法2：使用开发环境模拟（当前已实现）

我已经修改了代码，在开发环境中如果检测到无效的价格ID，会自动返回模拟响应，这样你可以继续测试订阅流程，只是不会跳转到真实的Stripe支付页面。

## 当前状态

✅ **已修复的问题**：
- JWT token格式问题
- 用户模型验证问题
- 添加了开发环境模拟响应

⚠️ **需要配置**：
- 有效的Stripe价格ID（用于真实支付）

## 测试方法

### 使用模拟响应测试：
1. 访问 `http://localhost:3000/login`
2. 点击"或使用测试模式登录"
3. 点击任意订阅计划
4. 会看到模拟的Stripe URL（包含mock=true标识）

### 使用真实Stripe测试：
1. 按照上述步骤创建Stripe价格
2. 更新环境变量
3. 重启开发服务器
4. 重复测试步骤，会跳转到真实的Stripe支付页面

## 推荐做法

1. **开发阶段**：使用当前的模拟响应功能进行测试
2. **生产部署前**：创建真实的Stripe价格并更新环境变量
3. **测试支付**：使用Stripe测试卡号进行支付测试

## Stripe测试卡号

当使用真实Stripe时，可以使用以下测试卡号：
- **成功支付**: 4242 4242 4242 4242
- **需要验证**: 4000 0025 0000 3155
- **被拒绝**: 4000 0000 0000 0002

## 注意事项

1. 确保在Stripe Dashboard中使用**测试模式**
2. 价格ID格式必须是 `price_` 开头
3. 创建价格后需要等待几分钟才能在API中使用
4. 生产环境必须使用真实的价格ID
