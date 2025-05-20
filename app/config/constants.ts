export const CONFIG = {
  FREE_TRIAL: {
    AUTHENTICATED_USER_LIMIT: 100, // 已登录用户的免费次数
    UNAUTHENTICATED_USER_LIMIT: 1, // 未登录用户的免费次数
  },
  SUBSCRIPTION: {
    PRICE: 9.99, // 订阅价格
    CURRENCY: 'USD', // 货币单位
  },
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 最大文件大小 (5MB)
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'], // 允许的文件类型
  },
} as const; 