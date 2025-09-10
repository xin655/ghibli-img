# Ghibli Dreamer

一个将照片转换为吉卜力风格的Web应用程序。

## 核心功能

根据要求，此项目只保留了以下核心功能：

### 1. 前端表单 + 登录操作
- **Google OAuth 登录**：使用Google账号登录
- **JWT认证**：基于JWT的用户认证系统
- **localStorage持久登录**：简单的本地存储持久化登录状态

### 2. 后端 JWT 认证 + MongoDB 存储
- **JWT认证**：无状态的JWT令牌认证
- **MongoDB数据库**：使用Mongoose ODM进行数据管理
- **用户模型**：存储用户基本信息和使用统计

### 3. 上传图片功能实现
- **前端文件上传组件**：支持拖拽和点击上传
- **图片预览**：上传后立即预览
- **AWS S3存储**：图片存储在AWS S3云服务
- **文件验证**：支持多种图片格式，最大5MB

### 4. Ghibli 风格生成 API 接入
- **OpenAI DALL-E 2集成**：调用OpenAI API进行图片风格转换
- **多种风格支持**：Ghibli、水彩、漫画、动漫风格
- **前端输入 → 后端处理 → 返回结果图**的完整流程
- **下载功能**：支持下载转换后的高清图片
- **失败处理**：完善的错误处理和用户提示

## 技术栈

### 前端
- **Next.js 15** - React框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **React Hooks** - 状态管理

### 后端
- **Next.js API Routes** - 服务端API
- **JWT** - 身份认证
- **MongoDB + Mongoose** - 数据存储
- **Google Auth Library** - Google OAuth验证

### 第三方服务
- **OpenAI DALL-E 2** - AI图片生成
- **AWS S3** - 文件存储
- **Google OAuth 2.0** - 用户认证

## 项目结构

```
app/
├── api/                    # API路由
│   ├── auth/              # JWT认证
│   ├── upload/            # 文件上传
│   ├── transform/         # 图片转换
│   └── download/          # 图片下载
├── components/            # (已清理，无额外组件)
├── config/               # 配置文件
├── lib/                  # 工具库
│   ├── db.ts            # MongoDB连接
│   └── authOptions.ts   # 认证配置
├── models/               # 数据模型
│   ├── User.ts          # 用户模型
│   └── Image.ts         # 图片模型
├── login/               # 登录页面
└── page.tsx            # 主页
```

## 环境变量

需要配置以下环境变量：

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# JWT
JWT_SECRET=your_jwt_secret

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket_name

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

## 运行项目

```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 功能说明

1. **用户认证**：用户可以使用Google账号登录，登录状态通过JWT令牌和localStorage维持
2. **图片上传**：支持拖拽或点击上传图片，自动预览并上传到AWS S3
3. **风格转换**：选择风格后，调用OpenAI DALL-E 2 API进行图片风格转换
4. **结果展示**：转换完成后展示结果图片，支持下载
5. **使用限制**：未登录用户有限制次数，登录用户有更多免费使用次数

## 📚 文档

完整的项目文档已整理到 `docs/` 目录中：

- **[📖 文档中心](./docs/README.md)** - 所有文档的索引
- **[🚀 部署指南](./docs/deployment/)** - Vercel免费版部署方案
- **[🛠️ 开发指南](./docs/development/)** - 环境配置和开发说明
- **[🔌 API文档](./docs/api/)** - Stripe集成和订阅功能
- **[📖 使用指南](./docs/guides/)** - 功能使用说明
- **[🔧 故障排除](./docs/troubleshooting/)** - 常见问题解决方案

### 快速开始
1. 查看 [环境设置指南](./docs/development/ENVIRONMENT_SETUP_GUIDE.md)
2. 参考 [Vercel部署指南](./docs/deployment/VERCEL_FREE_DEPLOYMENT_GUIDE.md)
3. 遇到问题查看 [故障排除](./docs/troubleshooting/) 部分

## 已移除功能

为了简化项目，已移除以下功能：
- Stripe支付系统
- 订阅管理
- 用户资料页面
- 发票和订阅历史
- NextAuth.js (改用简单JWT认证)
- 复杂的用户状态管理

---

此项目专注于核心的图片上传和AI风格转换功能，提供简洁而完整的用户体验。