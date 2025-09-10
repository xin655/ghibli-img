# 环境变量配置

创建 `.env.local` 文件并添加以下环境变量：

```env
# MongoDB连接字符串
MONGODB_URI=mongodb://localhost:27017/ghibli-dreamer

# Google OAuth配置
GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here

# JWT密钥
JWT_SECRET=your_jwt_secret_key_here

# AWS S3配置
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# OpenAI API密钥
OPENAI_API_KEY=your_openai_api_key_here
```

## 获取各项服务的配置信息

### 1. MongoDB
- 本地安装MongoDB或使用MongoDB Atlas云服务
- 获取连接字符串

### 2. Google OAuth
- 访问 [Google Cloud Console](https://console.cloud.google.com/)
- 创建新项目或使用现有项目
- 启用Google+ API
- 创建OAuth 2.0客户端ID
- 设置授权重定向URI

### 3. AWS S3
- 创建AWS账号
- 创建S3存储桶
- 创建IAM用户并获取访问密钥

### 4. OpenAI API
- 访问 [OpenAI Platform](https://platform.openai.com/)
- 创建账号并获取API密钥
- 确保账户有DALL-E 2的使用权限
