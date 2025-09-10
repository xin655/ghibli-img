export const CONFIG = {
  FREE_TRIAL: {
    AUTHENTICATED_USER_LIMIT: 100, // 已登录用户的免费次数
    UNAUTHENTICATED_USER_LIMIT: 1, // 未登录用户的免费次数
    CONVERSION_PROMPT_THRESHOLD: 80, // 80次时开始提示转化
    WARNING_THRESHOLD: 90, // 90次时显示警告
  },
  SUBSCRIPTION: {
    PRICE: 9.99, // 订阅价格
    CURRENCY: 'USD', // 货币单位
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
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 最大文件大小 (5MB)
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'], // 允许的文件类型
    ANONYMOUS_MAX_SIZE: 2 * 1024 * 1024, // 匿名用户限制2MB
    ANONYMOUS_MAX_RESOLUTION: 512, // 匿名用户限制512px
  },
} as const; 