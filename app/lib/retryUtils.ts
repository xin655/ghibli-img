/**
 * 重试工具函数
 * 提供自动重试机制和错误处理
 */

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
}

/**
 * 默认重试配置
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential',
  maxDelay: 10000,
  shouldRetry: (error: any) => {
    // 默认重试网络错误和5xx服务器错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true; // 网络错误
    }
    if (error.status >= 500) {
      return true; // 服务器错误
    }
    if (error.status === 429) {
      return true; // 限流错误
    }
    return false;
  }
};

/**
 * 计算重试延迟
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  let delay = options.delay;
  
  if (options.backoff === 'exponential') {
    delay = options.delay * Math.pow(2, attempt - 1);
  } else {
    delay = options.delay * attempt;
  }
  
  return Math.min(delay, options.maxDelay);
}

/**
 * 等待指定时间
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的异步函数执行器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt
      };
    } catch (error) {
      lastError = error;
      
      // 检查是否应该重试
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        break;
      }
      
      // 计算延迟时间
      const delay = calculateDelay(attempt, opts);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      
      // 等待后重试
      await wait(delay);
    }
  }
  
  return {
    success: false,
    error: lastError,
    attempts: opts.maxAttempts
  };
}

/**
 * 带重试的fetch请求
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const result = await withRetry(async () => {
    const response = await fetch(url, options);
    
    // 将非2xx状态码视为错误
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }
    
    return response;
  }, retryOptions);
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.data!;
}

/**
 * 带重试的API调用
 */
export async function apiCallWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryOptions);
  return response.json();
}

/**
 * 网络状态检测
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * 等待网络连接恢复
 */
export function waitForOnline(): Promise<void> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve();
      return;
    }
    
    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };
    
    window.addEventListener('online', handleOnline);
  });
}

/**
 * 带网络检测的重试
 */
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const networkAwareOptions = {
    ...options,
    shouldRetry: (error: any) => {
      // 如果网络离线，等待网络恢复
      if (!isOnline()) {
        return true;
      }
      
      // 使用自定义重试逻辑或默认逻辑
      return options.shouldRetry ? options.shouldRetry(error) : DEFAULT_OPTIONS.shouldRetry(error);
    }
  };
  
  return withRetry(async () => {
    // 如果网络离线，等待网络恢复
    if (!isOnline()) {
      await waitForOnline();
    }
    
    return fn();
  }, networkAwareOptions);
}

/**
 * 指数退避重试（专门用于API调用）
 */
export async function exponentialBackoffRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  const result = await withRetry(fn, {
    maxAttempts,
    backoff: 'exponential',
    delay: 1000,
    maxDelay: 10000
  });
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.data!;
}
