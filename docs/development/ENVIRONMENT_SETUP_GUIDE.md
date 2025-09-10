# 环境变量设置指南

## 问题诊断

根据错误日志 `POST /api/billing/checkout 401`，主要问题是：

1. **JWT_SECRET 未设置** - 导致token验证失败
2. **缺少必要的环境变量** - 影响订阅功能

## 解决步骤

### 1. 创建环境变量文件

在项目根目录创建 `.env.local` 文件：

```bash
# 复制示例文件
cp .env.example .env.local
```

### 2. 配置必要的环境变量

编辑 `.env.local` 文件，设置以下变量：

```env
# JWT密钥 - 必须设置，用于token验证
JWT_SECRET=your_secure_jwt_secret_key_here_change_this_in_production

# MongoDB连接字符串
MONGODB_URI=mongodb://localhost:27017/ghibli-dreamer

# Google OAuth配置
GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here

# Stripe配置（订阅功能必需）
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PRICE_ID_BASIC=your_stripe_basic_price_id_here
STRIPE_PRICE_ID_PRO=your_stripe_pro_price_id_here
STRIPE_PRICE_ID_ENTERPRISE=your_stripe_enterprise_price_id_here

# 应用基础URL
APP_BASE_URL=http://localhost:3000

# AWS S3配置（文件上传）
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# OpenAI API密钥（图片转换）
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 获取各项服务的配置信息

#### JWT_SECRET
- 生成一个安全的随机字符串
- 可以使用在线工具或命令行生成：
```bash
# 使用Node.js生成
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Stripe配置
1. 注册 [Stripe账号](https://stripe.com/)
2. 获取API密钥（测试环境使用 `sk_test_` 开头的密钥）
3. 创建产品和价格，获取价格ID

#### Google OAuth
1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目并启用Google+ API
3. 创建OAuth 2.0客户端ID
4. 设置授权重定向URI

#### MongoDB
- 本地安装MongoDB或使用MongoDB Atlas云服务
- 获取连接字符串

### 4. 重启开发服务器

```bash
npm run dev
```

## 错误处理改进

已实现的改进：

1. **更好的错误提示** - 替换了简单的alert，使用Toast组件
2. **Token验证增强** - 添加了详细的错误日志和状态码处理
3. **自动登录过期处理** - 检测到401错误时自动清除本地存储并刷新页面
4. **服务器配置检查** - 检查JWT_SECRET是否设置

## 测试订阅功能

1. 确保所有环境变量已正确设置
2. 启动开发服务器
3. 登录用户账号
4. 尝试订阅功能
5. 检查浏览器控制台和服务器日志

## 常见问题

### Q: 仍然收到401错误
A: 检查JWT_SECRET是否正确设置，确保重启了开发服务器

### Q: Stripe相关错误
A: 确保Stripe密钥和价格ID正确配置

### Q: 数据库连接错误
A: 检查MongoDB连接字符串和数据库服务状态

## 安全注意事项

1. **永远不要**将真实的API密钥提交到版本控制系统
2. 在生产环境中使用强密码作为JWT_SECRET
3. 定期轮换API密钥
4. 使用环境变量管理敏感信息

