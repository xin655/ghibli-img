# Vercel 免费版本部署指南

## 📋 项目概述

本项目是一个基于 Next.js 的 AI 图片转换应用，集成了以下核心功能：
- Google OAuth 用户认证
- MongoDB 数据库存储
- AWS S3 文件存储
- OpenAI DALL-E 图片转换
- Stripe 订阅支付系统

## 🚀 快速开始

### 5分钟快速部署

如果您想快速体验部署流程，可以按照以下步骤操作：

```bash
# 1. 克隆项目
git clone https://github.com/your-username/ghibli-img.git
cd ghibli-img

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 文件，至少配置以下变量：
# MONGODB_URI=your_mongodb_connection_string
# JWT_SECRET=your_jwt_secret
# GOOGLE_CLIENT_ID=your_google_client_id
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# 4. 本地测试
npm run build
npm run dev

# 5. 提交到GitHub
git add .
git commit -m "feat: 初始项目配置"
git push origin main

# 6. 在Vercel中导入项目
# 访问 https://vercel.com/new
# 选择你的GitHub仓库
# 配置环境变量
# 点击部署
```

### 最小化配置

如果只想快速验证部署流程，可以只配置以下必需的环境变量：

```env
# 必需配置
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ghibli-dreamer
JWT_SECRET=your_secure_jwt_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
APP_BASE_URL=https://your-app.vercel.app
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app

# 可选配置（功能会受限但可以运行）
# AWS_ACCESS_KEY_ID=your_aws_access_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key
# AWS_REGION=us-east-1
# S3_BUCKET_NAME=your-s3-bucket-name
# OPENAI_API_KEY=your_openai_api_key
```

## 🎯 Vercel 免费版本限制分析

### 1. 函数执行时间限制
- **免费版**: 10秒/请求
- **影响**: 图片转换和上传可能超时
- **解决方案**: 优化处理流程，使用异步处理

### 2. 函数内存限制
- **免费版**: 1024MB
- **影响**: 大图片处理可能内存不足
- **解决方案**: 图片压缩和分块处理

### 3. 带宽限制
- **免费版**: 100GB/月
- **影响**: 图片上传下载流量限制
- **解决方案**: 图片压缩和CDN优化

### 4. 环境变量限制
- **免费版**: 无限制
- **影响**: 无
- **解决方案**: 无需调整

## 🔧 部署前准备

### 1. 创建 Vercel 项目配置

创建 `vercel.json` 文件：

```json
{
  "functions": {
    "app/api/upload/route.ts": {
      "maxDuration": 10
    },
    "app/api/transform/route.ts": {
      "maxDuration": 10
    },
    "app/api/billing/webhook/route.ts": {
      "maxDuration": 10
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  }
}
```

### 2. 优化 Next.js 配置

更新 `next.config.js`：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'ghibli-imgs-1.s3.us-east-1.amazonaws.com',
    ],
  },
  // 优化构建
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb', // 减少到1MB以适应免费版限制
    },
  },
  // 启用压缩
  compress: true,
  // 优化输出
  output: 'standalone',
}

module.exports = nextConfig
```

### 3. 环境变量配置

在 Vercel 控制台设置以下环境变量：

#### 必需变量
```env
# 数据库
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ghibli-dreamer

# JWT 认证
JWT_SECRET=your_secure_jwt_secret_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# 应用基础URL
APP_BASE_URL=https://your-app.vercel.app
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

#### 可选变量（根据功能需求）
```env
# AWS S3 (文件存储)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# OpenAI API (图片转换)
OPENAI_API_KEY=your_openai_api_key

# Stripe (订阅支付)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_BASIC=price_your_basic_price_id
STRIPE_PRICE_ID_PRO=price_your_pro_price_id
STRIPE_PRICE_ID_ENTERPRISE=price_your_enterprise_price_id
```

## 🚀 部署步骤

### 1. 代码提交流程

#### 1.1 本地开发环境准备

```bash
# 克隆项目（如果从远程仓库）
git clone https://github.com/your-username/ghibli-img.git
cd ghibli-img

# 安装依赖
npm install

# 创建环境变量文件
cp .env.example .env.local

# 配置本地环境变量
# 编辑 .env.local 文件，填入必要的配置
```

#### 1.2 代码提交前检查

```bash
# 检查代码质量
npm run lint

# 运行类型检查
npx tsc --noEmit

# 运行构建测试
npm run build

# 检查环境变量配置
npm run check-env
```

#### 1.3 Git 工作流程

```bash
# 创建新分支（推荐使用功能分支）
git checkout -b feature/vercel-optimization

# 添加修改的文件
git add .

# 提交更改
git commit -m "feat: 优化Vercel部署配置

- 添加vercel.json配置文件
- 优化图片处理流程
- 增加超时处理机制
- 完善错误处理逻辑"

# 推送到远程仓库
git push origin feature/vercel-optimization
```

#### 1.4 创建 Pull Request

1. 在 GitHub 上创建 Pull Request
2. 添加详细的变更说明
3. 请求代码审查
4. 通过审查后合并到主分支

```bash
# 合并到主分支后
git checkout main
git pull origin main
git branch -d feature/vercel-optimization
```

### 2. 连接 GitHub 仓库到 Vercel

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 选择你的 GitHub 仓库
4. 配置项目设置

### 3. 配置构建设置

```bash
# 构建命令
npm run build

# 输出目录
.next

# 安装命令
npm install
```

### 4. 环境变量设置

在 Vercel 项目设置中添加所有必需的环境变量。

### 5. 部署配置

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

## 📝 代码提交规范

### 1. 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
# 功能新增
git commit -m "feat: 添加Vercel部署优化功能"

# 问题修复
git commit -m "fix: 修复图片上传超时问题"

# 文档更新
git commit -m "docs: 更新部署指南文档"

# 性能优化
git commit -m "perf: 优化图片压缩算法"

# 重构代码
git commit -m "refactor: 重构数据库连接逻辑"

# 测试相关
git commit -m "test: 添加API路由测试用例"

# 构建相关
git commit -m "build: 更新构建配置"
```

### 2. 分支命名规范

```bash
# 功能分支
feature/vercel-optimization
feature/user-authentication
feature/image-processing

# 修复分支
fix/upload-timeout
fix/database-connection
fix/stripe-webhook

# 热修复分支
hotfix/critical-security-issue
hotfix/production-error

# 发布分支
release/v1.0.0
release/v1.1.0
```

### 3. 代码审查清单

#### 3.1 提交前自检

- [ ] 代码符合项目规范
- [ ] 所有测试通过
- [ ] 类型检查无错误
- [ ] 构建成功
- [ ] 环境变量配置正确
- [ ] 文档更新完整

#### 3.2 代码审查要点

- [ ] 代码逻辑正确
- [ ] 错误处理完善
- [ ] 性能影响评估
- [ ] 安全性检查
- [ ] 可维护性
- [ ] 测试覆盖率

### 4. 自动化流程

#### 4.1 GitHub Actions 配置

创建 `.github/workflows/ci.yml`：

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run type check
      run: npx tsc --noEmit
    
    - name: Run tests
      run: npm test
    
    - name: Build project
      run: npm run build
      env:
        NODE_ENV: production

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
```

#### 4.2 预提交钩子

创建 `.husky/pre-commit`：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 运行代码检查
npm run lint

# 运行类型检查
npx tsc --noEmit

# 运行测试
npm test
```

### 5. 版本管理

#### 5.1 语义化版本控制

```bash
# 主版本号：不兼容的API修改
npm version major

# 次版本号：向下兼容的功能性新增
npm version minor

# 修订号：向下兼容的问题修正
npm version patch
```

#### 5.2 发布流程

```bash
# 1. 更新版本号
npm version patch

# 2. 创建标签
git tag -a v1.0.1 -m "Release version 1.0.1"

# 3. 推送到远程
git push origin main --tags

# 4. 创建发布说明
# 在 GitHub 上创建 Release
```

### 6. 回滚策略

#### 6.1 代码回滚

```bash
# 查看提交历史
git log --oneline

# 回滚到指定提交
git revert <commit-hash>

# 强制回滚（谨慎使用）
git reset --hard <commit-hash>
git push --force-with-lease origin main
```

#### 6.2 Vercel 部署回滚

1. 在 Vercel Dashboard 中查看部署历史
2. 选择要回滚的版本
3. 点击 "Promote to Production"
4. 确认回滚操作

### 7. 监控和通知

#### 7.1 部署状态通知

```yaml
# 在 GitHub Actions 中添加通知
- name: Notify deployment status
  if: always()
  run: |
    if [ "${{ job.status }}" == "success" ]; then
      echo "✅ 部署成功"
    else
      echo "❌ 部署失败"
    fi
```

#### 7.2 错误监控

```typescript
// 在应用中添加错误监控
import { captureException } from '@sentry/nextjs';

export const reportError = (error: Error, context?: any) => {
  console.error('Application Error:', error);
  captureException(error, { extra: context });
};
```

## 🔄 功能适配方案

### 1. 图片上传优化

创建 `app/api/upload/optimized/route.ts`：

```typescript
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export const POST = async (req: Request) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 压缩图片以适应免费版限制
    const buffer = Buffer.from(await file.arrayBuffer());
    const compressedBuffer = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // 检查文件大小（免费版限制）
    if (compressedBuffer.length > 4.5 * 1024 * 1024) { // 4.5MB
      return NextResponse.json(
        { error: 'File too large after compression' },
        { status: 400 }
      );
    }

    // 继续处理...
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
};
```

### 2. 图片转换优化

创建 `app/api/transform/optimized/route.ts`：

```typescript
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const POST = async (req: Request) => {
  try {
    const { imageUrl, style } = await req.json();
    
    // 设置超时处理
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 8000); // 8秒超时
    });

    const transformPromise = openai.images.createVariation({
      image: imageUrl,
      n: 1,
      size: "512x512", // 使用较小尺寸以节省时间
    });

    const response = await Promise.race([transformPromise, timeoutPromise]);
    
    return NextResponse.json({
      transformedUrl: response.data[0].url,
      style: style,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Transform failed or timeout' },
      { status: 500 }
    );
  }
};
```

### 3. 数据库连接优化

更新 `app/lib/db.ts`：

```typescript
import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 5, // 减少连接池大小
      minPoolSize: 1,
      socketTimeoutMS: 30000, // 30秒超时
      connectTimeoutMS: 15000, // 15秒连接超时
      serverSelectionTimeoutMS: 15000,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI!, opts)
      .then((mongoose) => {
        console.log('Connected to MongoDB');
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
```

## 📊 性能监控

### 1. 添加性能监控

创建 `app/lib/performance.ts`：

```typescript
export class PerformanceMonitor {
  static async measureTime<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      
      if (duration > 5000) { // 超过5秒记录警告
        console.warn(`Slow operation: ${operationName} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`Operation failed: ${operationName} after ${duration}ms`, error);
      throw error;
    }
  }
}
```

### 2. 错误处理优化

创建 `app/lib/errorHandler.ts`：

```typescript
export class VercelErrorHandler {
  static handleTimeout(error: Error): NextResponse {
    if (error.message.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Request timeout',
          message: 'The operation took too long. Please try with a smaller image.'
        },
        { status: 408 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  static handleMemoryError(error: Error): NextResponse {
    if (error.message.includes('memory') || error.message.includes('heap')) {
      return NextResponse.json(
        { 
          error: 'Memory limit exceeded',
          message: 'Image too large. Please use a smaller image.'
        },
        { status: 413 }
      );
    }
    return this.handleTimeout(error);
  }
}
```

## 🔒 安全配置

### 1. 环境变量安全

```typescript
// app/lib/env.ts
export const validateEnv = () => {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

### 2. API 路由保护

```typescript
// app/lib/auth.ts
export const withAuth = (handler: Function) => {
  return async (req: Request) => {
    try {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      
      return handler(req, decoded);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  };
};
```

## 📈 监控和日志

### 1. 添加 Vercel Analytics

```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. 错误监控

```typescript
// app/lib/logger.ts
export const logError = (error: Error, context: any) => {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};
```

## 🚨 故障排除

### 1. 常见问题

#### 函数超时
```typescript
// 解决方案：添加超时处理
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout')), 8000);
});

const result = await Promise.race([operationPromise, timeoutPromise]);
```

#### 内存不足
```typescript
// 解决方案：图片压缩
const compressedBuffer = await sharp(buffer)
  .resize(800, 800, { fit: 'inside' })
  .jpeg({ quality: 70 })
  .toBuffer();
```

#### 数据库连接失败
```typescript
// 解决方案：连接重试
const connectWithRetry = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await connectDB();
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 2. 性能优化建议

1. **图片优化**：
   - 使用 WebP 格式
   - 实施懒加载
   - 压缩图片尺寸

2. **数据库优化**：
   - 使用索引
   - 限制查询结果
   - 实施连接池

3. **缓存策略**：
   - 使用 Vercel Edge Cache
   - 实施 API 缓存
   - 静态资源缓存

## 📋 部署检查清单

### 部署前检查
- [ ] 环境变量配置完整
- [ ] 数据库连接正常
- [ ] 第三方服务配置正确
- [ ] 图片大小限制设置
- [ ] 超时处理实现
- [ ] 错误处理完善
- [ ] 代码审查通过
- [ ] 测试用例通过
- [ ] 构建成功
- [ ] 文档更新完整

### 部署后验证
- [ ] 用户注册登录功能
- [ ] 图片上传功能
- [ ] 图片转换功能
- [ ] 订阅支付功能（如果启用）
- [ ] 管理后台功能
- [ ] 错误日志监控
- [ ] 性能指标正常
- [ ] 监控告警配置

## 🔄 持续集成/持续部署 (CI/CD)

### 1. 完整的 CI/CD 流程

```mermaid
graph LR
    A[代码提交] --> B[GitHub Actions]
    B --> C[代码检查]
    C --> D[测试运行]
    D --> E[构建项目]
    E --> F[部署到Vercel]
    F --> G[健康检查]
    G --> H[通知团队]
```

### 2. 环境管理

#### 2.1 环境分支策略

```bash
# 开发环境
develop -> Vercel Preview

# 测试环境
staging -> Vercel Preview (staging分支)

# 生产环境
main -> Vercel Production
```

#### 2.2 环境变量管理

```bash
# 开发环境变量
VERCEL_ENV=development

# 测试环境变量
VERCEL_ENV=preview

# 生产环境变量
VERCEL_ENV=production
```

### 3. 质量门禁

#### 3.1 代码质量检查

```yaml
# 在 GitHub Actions 中添加质量门禁
- name: Code Quality Gate
  run: |
    # 代码覆盖率检查
    npm run test:coverage
    if [ $? -ne 0 ]; then
      echo "❌ 代码覆盖率不达标"
      exit 1
    fi
    
    # 代码复杂度检查
    npm run complexity-check
    if [ $? -ne 0 ]; then
      echo "❌ 代码复杂度过高"
      exit 1
    fi
```

#### 3.2 安全扫描

```yaml
- name: Security Scan
  run: |
    # 依赖漏洞扫描
    npm audit --audit-level moderate
    if [ $? -ne 0 ]; then
      echo "❌ 发现安全漏洞"
      exit 1
    fi
    
    # 代码安全扫描
    npm run security-scan
```

### 4. 部署策略

#### 4.1 蓝绿部署

```yaml
- name: Blue-Green Deployment
  run: |
    # 部署到绿色环境
    vercel deploy --target=preview
    
    # 运行健康检查
    npm run health-check
    
    # 如果健康检查通过，切换到生产环境
    if [ $? -eq 0 ]; then
      vercel promote
    fi
```

#### 4.2 金丝雀部署

```yaml
- name: Canary Deployment
  run: |
    # 部署到金丝雀环境
    vercel deploy --target=preview --env=canary
    
    # 运行A/B测试
    npm run ab-test
    
    # 根据测试结果决定是否全量发布
    if [ $? -eq 0 ]; then
      vercel promote
    fi
```

### 5. 监控和告警

#### 5.1 部署监控

```typescript
// 部署状态监控
export const monitorDeployment = async () => {
  const deployment = await vercel.deployments.get({
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID
  });
  
  if (deployment.state === 'ERROR') {
    await sendAlert('部署失败', deployment);
  }
};
```

#### 5.2 性能监控

```typescript
// 性能指标监控
export const monitorPerformance = async () => {
  const metrics = await getPerformanceMetrics();
  
  if (metrics.responseTime > 5000) {
    await sendAlert('响应时间过长', metrics);
  }
  
  if (metrics.errorRate > 0.05) {
    await sendAlert('错误率过高', metrics);
  }
};
```

### 6. 故障恢复

#### 6.1 自动回滚

```yaml
- name: Auto Rollback
  if: failure()
  run: |
    # 获取上一个稳定版本
    PREVIOUS_DEPLOYMENT=$(vercel deployments list --limit=2 | tail -1 | awk '{print $1}')
    
    # 回滚到上一个版本
    vercel promote $PREVIOUS_DEPLOYMENT
    
    # 发送通知
    curl -X POST $SLACK_WEBHOOK_URL \
      -H 'Content-type: application/json' \
      --data '{"text":"🚨 自动回滚已执行"}'
```

#### 6.2 健康检查

```typescript
// 健康检查端点
export async function GET() {
  try {
    // 检查数据库连接
    await connectDB();
    
    // 检查外部服务
    await checkExternalServices();
    
    return NextResponse.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
```

### 7. 团队协作

#### 7.1 代码审查流程

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发并提交
git add .
git commit -m "feat: 添加新功能"

# 3. 推送并创建PR
git push origin feature/new-feature

# 4. 请求代码审查
# 在GitHub上创建Pull Request

# 5. 审查通过后合并
git checkout main
git pull origin main
git branch -d feature/new-feature
```

#### 7.2 发布管理

```bash
# 1. 创建发布分支
git checkout -b release/v1.0.0

# 2. 更新版本号
npm version patch

# 3. 合并到主分支
git checkout main
git merge release/v1.0.0

# 4. 创建标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 5. 推送到远程
git push origin main --tags

# 6. 删除发布分支
git branch -d release/v1.0.0
```

## 🔄 升级路径

当应用增长超出免费版限制时，考虑以下升级选项：

1. **Vercel Pro** ($20/月)
   - 函数执行时间：60秒
   - 内存：3008MB
   - 带宽：1TB/月

2. **Vercel Enterprise**
   - 自定义限制
   - 优先支持
   - 高级功能

## ❓ 常见问题解答

### 1. 部署相关问题

#### Q: 部署时出现构建错误怎么办？
A: 检查以下几点：
- 确保所有依赖都已正确安装
- 检查环境变量是否配置完整
- 查看构建日志中的具体错误信息
- 确保代码没有语法错误

#### Q: 函数执行超时怎么办？
A: 优化建议：
- 减少图片处理时间
- 使用异步处理
- 优化数据库查询
- 实施缓存策略

#### Q: 内存不足错误怎么解决？
A: 解决方案：
- 压缩图片大小
- 优化数据处理逻辑
- 减少并发处理数量
- 使用流式处理

### 2. 环境变量问题

#### Q: 环境变量不生效怎么办？
A: 检查步骤：
- 确保变量名拼写正确
- 检查是否在正确的环境中设置
- 重新部署应用
- 查看Vercel控制台的环境变量配置

#### Q: 敏感信息如何保护？
A: 安全建议：
- 使用Vercel的环境变量功能
- 不要在代码中硬编码敏感信息
- 定期轮换API密钥
- 使用最小权限原则

### 3. 性能优化问题

#### Q: 应用响应慢怎么办？
A: 优化策略：
- 启用Vercel Edge Cache
- 优化图片加载
- 使用CDN加速
- 实施代码分割

#### Q: 数据库连接慢怎么解决？
A: 优化方案：
- 使用连接池
- 优化查询语句
- 添加数据库索引
- 考虑使用缓存

### 4. 功能限制问题

#### Q: 免费版功能受限怎么办？
A: 解决方案：
- 优化现有功能
- 实施使用量限制
- 考虑升级到付费版
- 使用替代方案

#### Q: 如何监控应用状态？
A: 监控工具：
- Vercel Analytics
- 自定义健康检查
- 错误监控服务
- 性能监控工具

### 5. 故障排除

#### Q: 应用无法访问怎么办？
A: 排查步骤：
- 检查域名配置
- 查看部署状态
- 检查环境变量
- 查看错误日志

#### Q: 数据库连接失败怎么处理？
A: 解决步骤：
- 检查连接字符串
- 验证网络连接
- 检查数据库状态
- 查看连接日志

## 📞 支持资源

### 官方文档
- [Vercel 文档](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [AWS S3 文档](https://docs.aws.amazon.com/s3/)
- [Stripe 文档](https://stripe.com/docs)

### 社区资源
- [Vercel 社区论坛](https://github.com/vercel/vercel/discussions)
- [Next.js 社区](https://github.com/vercel/next.js/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/vercel)

### 工具推荐
- [Vercel CLI](https://vercel.com/cli)
- [MongoDB Compass](https://www.mongodb.com/products/compass)
- [Postman](https://www.postman.com/) (API测试)
- [Sentry](https://sentry.io/) (错误监控)

## 📝 更新日志

### v1.0.0 (2024-01-XX)
- 初始版本发布
- 支持Vercel免费版部署
- 完整的CI/CD流程
- 性能优化方案

### 计划中的功能
- [ ] 多环境部署支持
- [ ] 自动化测试集成
- [ ] 性能监控仪表板
- [ ] 安全扫描集成

---

**注意**: 本指南基于 Vercel 免费版限制制定，确保在不影响核心功能的前提下实现部署。建议在生产环境使用前进行充分测试。

**贡献**: 如果您发现指南中的问题或有改进建议，欢迎提交 Issue 或 Pull Request。
