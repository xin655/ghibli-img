# 管理员账户设置指南

## 🎯 设置管理员账户的完整步骤

### 方法1: 通过环境变量设置（推荐）

#### 1. 创建环境配置文件

在项目根目录创建 `.env.local` 文件：

```env
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/ghibli-img

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here

# Stripe配置
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# 管理员邮箱配置（用逗号分隔多个邮箱）
ADMIN_EMAILS=admin@example.com,manager@company.com,ceo@company.com
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com,manager@company.com,ceo@company.com

# Google OAuth配置
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 应用配置
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

#### 2. 设置管理员邮箱

在 `ADMIN_EMAILS` 和 `NEXT_PUBLIC_ADMIN_EMAILS` 中添加管理员邮箱：

```env
# 单个管理员
ADMIN_EMAILS=admin@example.com

# 多个管理员（用逗号分隔）
ADMIN_EMAILS=admin@example.com,manager@company.com,ceo@company.com
```

#### 3. 重启应用

```bash
npm run dev
```

### 方法2: 通过数据库直接创建管理员用户

#### 1. 创建管理员用户脚本

创建 `scripts/create-admin-user.js` 文件：

```javascript
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// 用户模型
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  photo: { type: String, default: '' },
  googleId: { type: String, unique: true, sparse: true },
  usage: {
    freeTrialsRemaining: { type: Number, default: 0 },
    totalTransformations: { type: Number, default: 0 }
  },
  subscription: {
    isActive: { type: Boolean, default: false },
    plan: { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' },
    stripeCustomerId: { type: String, default: '' },
    stripeSubscriptionId: { type: String, default: '' },
    currentPeriodEnd: { type: Date, default: null }
  }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ghibli-img');
    console.log('✅ 数据库连接成功');

    const adminEmail = process.argv[2] || 'admin@example.com';
    const adminName = process.argv[3] || 'Admin User';

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      console.log(`⚠️ 用户 ${adminEmail} 已存在`);
      return;
    }

    // 创建管理员用户
    const adminUser = new User({
      email: adminEmail,
      name: adminName,
      photo: '',
      googleId: `admin_${Date.now()}`,
      usage: {
        freeTrialsRemaining: -1, // 无限制使用
        totalTransformations: 0
      },
      subscription: {
        isActive: true,
        plan: 'enterprise',
        stripeCustomerId: 'admin_customer',
        stripeSubscriptionId: 'admin_subscription',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    await adminUser.save();
    console.log('✅ 管理员用户创建成功');

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: adminUser._id.toString(),
        email: adminUser.email,
        googleId: adminUser.googleId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('🔑 管理员登录Token:', token);

  } catch (error) {
    console.error('❌ 创建管理员用户失败:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createAdminUser();
```

#### 2. 运行脚本创建管理员

```bash
# 使用默认邮箱
node scripts/create-admin-user.js

# 指定邮箱和姓名
node scripts/create-admin-user.js admin@yourcompany.com "Admin User"
```

### 方法3: 通过现有用户升级为管理员

#### 1. 检查现有用户

```bash
node scripts/check-user-database.js
```

#### 2. 修改用户权限

在数据库中直接修改用户记录，将邮箱添加到管理员列表中。

## 🔧 验证管理员设置

### 1. 测试管理员权限

```bash
node scripts/test-admin-analytics.js
```

### 2. 检查环境变量

```bash
node scripts/check-env.js
```

### 3. 验证用户状态

```bash
node scripts/check-user-status.js
```

## 📋 管理员权限功能

### 1. 数据分析页面
- 访问 `/analytics` 页面
- 查看订阅统计和分析
- 查看收入和使用量数据

### 2. 管理功能
- 查看所有用户数据
- 访问系统分析报告
- 管理订阅和支付记录

### 3. 系统监控
- 实时数据监控
- 用户行为分析
- 系统性能指标

## 🚨 安全注意事项

### 1. 环境变量安全
- 不要将 `.env.local` 文件提交到版本控制
- 使用强密码作为JWT_SECRET
- 定期轮换密钥

### 2. 管理员邮箱安全
- 使用公司邮箱作为管理员账户
- 定期检查管理员列表
- 及时移除离职员工权限

### 3. 访问控制
- 限制管理员数量
- 记录管理员操作日志
- 实施多因素认证

## 🔄 常见问题解决

### 1. 管理员无法访问数据分析页面

**检查项目**:
- 环境变量 `ADMIN_EMAILS` 是否正确设置
- 用户邮箱是否在管理员列表中
- 应用是否已重启

**解决方案**:
```bash
# 检查环境变量
echo $ADMIN_EMAILS

# 重启应用
npm run dev
```

### 2. 权限验证失败

**检查项目**:
- JWT token是否有效
- 用户是否存在
- 数据库连接是否正常

**解决方案**:
```bash
# 重新生成token
node scripts/generate-valid-token.js

# 检查数据库连接
node scripts/test-mongodb.js
```

### 3. 多个管理员设置

**设置方法**:
```env
ADMIN_EMAILS=admin1@company.com,admin2@company.com,admin3@company.com
```

**验证方法**:
```bash
# 测试每个管理员权限
node scripts/test-admin-analytics.js
```

## 📞 技术支持

如果遇到问题，请检查：

1. **环境变量配置** - 确保所有必要的环境变量都已设置
2. **数据库连接** - 确保MongoDB连接正常
3. **用户数据** - 确保用户记录存在且正确
4. **权限验证** - 确保邮箱在管理员列表中

---

**✅ 按照以上步骤设置，您就可以成功创建管理员账户并访问数据分析功能！**

