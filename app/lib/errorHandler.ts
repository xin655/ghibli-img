// 错误处理工具类
export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
  code?: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
}

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  IMAGE_TRANSFORM_ERROR = 'IMAGE_TRANSFORM_ERROR'
}

export class ErrorHandler {
  // 将技术错误转换为用户友好的错误信息
  static handleApiError(error: any): UserFriendlyError {
    console.error('API Error:', error);

    // 网络错误
    if (!navigator.onLine) {
      return {
        title: '网络连接问题',
        message: '请检查您的网络连接后重试',
        action: '检查网络',
        retryable: true,
        code: 'NETWORK_OFFLINE'
      };
    }

    // 超时错误
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return {
        title: '请求超时',
        message: '服务器响应时间过长，请稍后重试',
        action: '重试',
        retryable: true,
        code: 'TIMEOUT'
      };
    }

    // API 错误响应
    if (error.response || error.status) {
      const status = error.status || error.response?.status;
      const data = error.response?.data || error.data;

      switch (status) {
        case 400:
          return {
            title: '请求参数错误',
            message: data?.error || '请检查输入的信息是否正确',
            action: '检查输入',
            retryable: false,
            code: 'BAD_REQUEST'
          };

        case 401:
          return {
            title: '登录已过期',
            message: '请重新登录以继续使用',
            action: '重新登录',
            retryable: false,
            code: 'UNAUTHORIZED'
          };

        case 403:
          return {
            title: '权限不足',
            message: '您没有权限执行此操作',
            action: '联系管理员',
            retryable: false,
            code: 'FORBIDDEN'
          };

        case 404:
          return {
            title: '资源不存在',
            message: '请求的资源不存在或已被删除',
            action: '刷新页面',
            retryable: true,
            code: 'NOT_FOUND'
          };

        case 429:
          return {
            title: '请求过于频繁',
            message: '请稍后再试，避免频繁操作',
            action: '稍后重试',
            retryable: true,
            code: 'RATE_LIMIT'
          };

        case 500:
        case 502:
        case 503:
        case 504:
          return {
            title: '服务器错误',
            message: '服务器暂时无法处理请求，请稍后重试',
            action: '重试',
            retryable: true,
            code: 'SERVER_ERROR'
          };

        default:
          return {
            title: '请求失败',
            message: data?.error || '请求处理失败，请重试',
            action: '重试',
            retryable: true,
            code: 'UNKNOWN_ERROR'
          };
      }
    }

    // 文件上传错误
    if (error.message?.includes('file') || error.message?.includes('upload')) {
      return {
        title: '文件上传失败',
        message: '文件上传过程中出现问题，请检查文件格式和大小',
        action: '重新选择文件',
        retryable: true,
        code: 'FILE_UPLOAD_ERROR'
      };
    }

    // 图片转换错误
    if (error.message?.includes('transform') || error.message?.includes('AI')) {
      return {
        title: '图片转换失败',
        message: 'AI 图片转换服务暂时不可用，请稍后重试',
        action: '重试转换',
        retryable: true,
        code: 'IMAGE_TRANSFORM_ERROR'
      };
    }

    // 默认错误
    return {
      title: '操作失败',
      message: error.message || '发生了未知错误，请重试',
      action: '重试',
      retryable: true,
      code: 'UNKNOWN_ERROR'
    };
  }

  // 显示错误提示
  static showErrorToast(error: UserFriendlyError, onRetry?: () => void): void {
    // 创建错误提示元素
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 max-w-sm w-full bg-white border-l-4 border-red-500 border rounded-lg shadow-lg p-4 z-50 animate-slide-down';
    
    toast.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0 text-red-500">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium text-red-800">${error.title}</h3>
          <p class="text-sm text-red-700 mt-1">${error.message}</p>
          ${error.retryable && onRetry ? `
            <div class="mt-3">
              <button class="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors" onclick="this.closest('.fixed').remove(); (${onRetry.toString()})()">
                ${error.action || '重试'}
              </button>
            </div>
          ` : ''}
        </div>
        <div class="ml-4 flex-shrink-0">
          <button class="text-red-400 hover:text-red-600 transition-colors" onclick="this.closest('.fixed').remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    // 自动移除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 8000);
  }

  // 记录错误日志
  static logError(error: Error, context: ErrorContext): void {
    const errorLog = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Error logged:', errorLog);

    // 这里可以发送到错误监控服务
    // ErrorReportingService.reportError(errorLog);
  }

  // 处理网络状态变化
  static handleNetworkStatus(): void {
    const handleOnline = () => {
      ErrorHandler.showErrorToast({
        title: '网络已连接',
        message: '网络连接已恢复，您可以继续使用',
        retryable: false
      });
    };

    const handleOffline = () => {
      ErrorHandler.showErrorToast({
        title: '网络连接断开',
        message: '请检查您的网络连接',
        retryable: false
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 返回清理函数
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}

// 错误重试工具
export class RetryManager {
  private static retryCounts = new Map<string, number>();
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // 递增延迟

  static async withRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    onRetry?: (attempt: number) => void
  ): Promise<T> {
    const retryCount = this.retryCounts.get(operationId) || 0;

    try {
      const result = await operation();
      // 成功后重置重试计数
      this.retryCounts.delete(operationId);
      return result;
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        const newRetryCount = retryCount + 1;
        this.retryCounts.set(operationId, newRetryCount);
        
        onRetry?.(newRetryCount);
        
        // 等待后重试
        await new Promise(resolve => 
          setTimeout(resolve, this.RETRY_DELAYS[retryCount])
        );
        
        return this.withRetry(operation, operationId, onRetry);
      } else {
        // 达到最大重试次数，重置计数并抛出错误
        this.retryCounts.delete(operationId);
        throw error;
      }
    }
  }

  static resetRetryCount(operationId: string): void {
    this.retryCounts.delete(operationId);
  }
}
