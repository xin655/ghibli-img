# 免费试用方案实施计划

## 🎯 基于当前代码的实施方案

基于对现有代码的分析，以下是具体的实施步骤和代码修改建议。

## 📋 当前状态分析

### 已有功能
- ✅ 基础用户认证 (Google OAuth)
- ✅ 图片上传和转换
- ✅ 使用次数统计
- ✅ 基础权限控制

### 需要改进的地方
- ❌ 转化提示不够明显
- ❌ 缺少付费订阅功能
- ❌ 数据分析不够完善
- ❌ 用户体验可以优化

## 🔧 代码修改计划

### 1. 配置文件优化

**文件**: `app/config/constants.ts`

```typescript
export const CONFIG = {
  FREE_TRIAL: {
    AUTHENTICATED_USER_LIMIT: 100,
    UNAUTHENTICATED_USER_LIMIT: 1,
    // 新增配置
    CONVERSION_PROMPT_THRESHOLD: 80, // 80次时开始提示转化
    WARNING_THRESHOLD: 90, // 90次时显示警告
  },
  SUBSCRIPTION: {
    PRICE: 9.99,
    CURRENCY: 'USD',
    // 新增套餐配置
    PLANS: {
      BASIC: {
        name: '基础套餐',
        price: 9.99,
        conversions: 500,
        features: ['标准分辨率', '历史保存', '邮件支持']
      },
      PRO: {
        name: '专业套餐', 
        price: 19.99,
        conversions: 2000,
        features: ['高分辨率', '批量处理', '优先支持']
      },
      ENTERPRISE: {
        name: '企业套餐',
        price: 49.99,
        conversions: -1, // 无限制
        features: ['最高分辨率', 'API访问', '定制开发']
      }
    }
  },
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    // 新增限制配置
    ANONYMOUS_MAX_SIZE: 2 * 1024 * 1024, // 匿名用户限制2MB
    ANONYMOUS_MAX_RESOLUTION: 512, // 匿名用户限制512px
  },
} as const;
```

### 2. 用户模型扩展

**文件**: `app/models/User.ts`

```typescript
// 在现有接口基础上添加
export interface IUserDocument extends Document {
  // ... 现有字段
  subscription?: {
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    startDate?: Date;
    endDate?: Date;
    isActive: boolean;
  };
  conversionPrompts: {
    shownAt: Date[];
    lastShownAt?: Date;
  };
  analytics: {
    totalSessions: number;
    lastActiveAt: Date;
    preferredStyle: string;
    avgConversionsPerSession: number;
  };
}
```

### 3. 新增订阅模型

**文件**: `app/models/Subscription.ts`

```typescript
import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  plan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: Date,
  paymentMethod: String,
  amount: Number,
  currency: String,
}, {
  timestamps: true,
});

export default mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
```

### 4. 新增使用统计模型

**文件**: `app/models/Usage.ts`

```typescript
import mongoose from 'mongoose';

const usageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  conversions: {
    type: Number,
    default: 0,
  },
  uploads: {
    type: Number,
    default: 0,
  },
  downloads: {
    type: Number,
    default: 0,
  },
  styles: {
    ghibli: { type: Number, default: 0 },
    watercolor: { type: Number, default: 0 },
    comic: { type: Number, default: 0 },
    anime: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

usageSchema.index({ userId: 1, date: -1 });

export default mongoose.models.Usage || mongoose.model('Usage', usageSchema);
```

### 5. 前端组件优化

**文件**: `app/components/ConversionPrompt.tsx`

```typescript
"use client";
import { useState } from 'react';
import { CONFIG } from '@/app/config/constants';

interface ConversionPromptProps {
  remainingCount: number;
  totalCount: number;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export default function ConversionPrompt({ 
  remainingCount, 
  totalCount, 
  onUpgrade, 
  onDismiss 
}: ConversionPromptProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  if (!isVisible) return null;
  
  const usagePercentage = ((totalCount - remainingCount) / totalCount) * 100;
  const isNearLimit = usagePercentage >= 80;
  
  return (
    <div className={`fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-lg border-l-4 ${
      isNearLimit ? 'border-red-500' : 'border-yellow-500'
    } p-4 z-50`}>
      <div className="flex items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {isNearLimit ? '试用次数即将用完' : '升级获得更多功能'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            您已使用 {totalCount - remainingCount}/{totalCount} 次转换
          </p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${isNearLimit ? 'bg-red-500' : 'bg-yellow-500'}`}
                style={{ width: `${usagePercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={onUpgrade}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              立即升级
            </button>
            <button
              onClick={() => {
                setIsVisible(false);
                onDismiss();
              }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              稍后提醒
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 6. 订阅管理API

**文件**: `app/api/subscription/route.ts`

```typescript
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import Subscription from '@/app/models/Subscription';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    await connectDB();
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { plan, paymentMethod } = await request.json();
    
    // 创建订阅记录
    const subscription = await Subscription.create({
      userId: user._id,
      plan,
      paymentMethod,
      amount: CONFIG.SUBSCRIPTION.PLANS[plan.toUpperCase()].price,
      currency: CONFIG.SUBSCRIPTION.CURRENCY,
    });

    // 更新用户订阅状态
    user.subscription = {
      plan,
      startDate: new Date(),
      isActive: true,
    };
    await user.save();

    return NextResponse.json({
      success: true,
      subscription,
      message: '订阅成功'
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
```

### 7. 使用统计API

**文件**: `app/api/usage/route.ts`

```typescript
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';
import Usage from '@/app/models/Usage';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    await connectDB();
    
    // 获取用户使用统计
    const usage = await Usage.find({ userId: decoded.userId })
      .sort({ date: -1 })
      .limit(30); // 最近30天

    // 计算总统计
    const totalStats = await Usage.aggregate([
      { $match: { userId: decoded.userId } },
      {
        $group: {
          _id: null,
          totalConversions: { $sum: '$conversions' },
          totalUploads: { $sum: '$uploads' },
          totalDownloads: { $sum: '$downloads' },
          avgConversionsPerDay: { $avg: '$conversions' }
        }
      }
    ]);

    return NextResponse.json({
      dailyUsage: usage,
      totalStats: totalStats[0] || {
        totalConversions: 0,
        totalUploads: 0,
        totalDownloads: 0,
        avgConversionsPerDay: 0
      }
    });

  } catch (error) {
    console.error('Usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 }
    );
  }
}
```

## 🚀 实施步骤

### 第一阶段：基础优化 (1周)
1. 更新配置文件，添加新的限制和套餐信息
2. 优化前端UI，添加转化提示组件
3. 改进使用次数显示和警告机制

### 第二阶段：数据模型 (1周)
1. 创建新的数据模型 (Subscription, Usage)
2. 更新现有User模型
3. 创建数据库迁移脚本

### 第三阶段：API开发 (1周)
1. 开发订阅管理API
2. 开发使用统计API
3. 更新现有API以支持新的限制

### 第四阶段：前端集成 (1周)
1. 集成转化提示组件
2. 添加订阅管理界面
3. 优化用户体验流程

### 第五阶段：测试和优化 (1周)
1. 全面测试所有功能
2. 性能优化
3. 数据分析集成

## 📊 成功指标

### 技术指标
- [ ] 转化提示显示准确率 > 95%
- [ ] API响应时间 < 500ms
- [ ] 数据库查询优化，支持高并发

### 业务指标
- [ ] 注册转化率提升 > 20%
- [ ] 付费转化率 > 5%
- [ ] 用户留存率 > 60% (7天)

### 用户体验指标
- [ ] 页面加载时间 < 2s
- [ ] 用户满意度 > 4.5/5
- [ ] 客服咨询减少 > 30%

---

**实施时间**: 2025年9月6日 - 2025年10月4日  
**负责人**: 开发团队  
**状态**: 待开始
