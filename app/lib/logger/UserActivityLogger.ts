import { logger, LogCategory } from './Logger';

export enum UserAction {
  // Authentication actions
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  TOKEN_REFRESH = 'token_refresh',
  
  // File operations
  UPLOAD_FILE = 'upload_file',
  DELETE_FILE = 'delete_file',
  DOWNLOAD_FILE = 'download_file',
  
  // Image processing
  TRANSFORM_IMAGE = 'transform_image',
  SELECT_STYLE = 'select_style',
  
  // Subscription actions
  SUBSCRIBE = 'subscribe',
  CANCEL_SUBSCRIPTION = 'cancel_subscription',
  UPGRADE_PLAN = 'upgrade_plan',
  DOWNGRADE_PLAN = 'downgrade_plan',
  
  // User management
  UPDATE_PROFILE = 'update_profile',
  CHANGE_PASSWORD = 'change_password',
  
  // Navigation
  PAGE_VIEW = 'page_view',
  FEATURE_ACCESS = 'feature_access',
  
  // Support
  CONTACT_SUPPORT = 'contact_support',
  FEEDBACK = 'feedback',
  
  // Security
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'
}

export interface UserActivityContext {
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface UserActivityData {
  action: UserAction;
  resource?: string;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
  duration?: number;
  fileSize?: number;
  imageStyle?: string;
  subscriptionPlan?: string;
  pageUrl?: string;
  featureName?: string;
}

export class UserActivityLogger {
  public static logUserAction(
    action: UserAction,
    data: UserActivityData,
    context: UserActivityContext = {}
  ): void {
    const logData = {
      action: action,
      ...data,
      timestamp: context.timestamp || new Date().toISOString()
    };

    // Determine log level based on action type
    let level: 'info' | 'warn' | 'error' = 'info';
    
    if (data.success === false) {
      level = 'error';
    } else if (action === UserAction.SUSPICIOUS_ACTIVITY || action === UserAction.RATE_LIMIT_EXCEEDED) {
      level = 'warn';
    }

    // Log to appropriate category
    const category = this.getCategoryForAction(action);
    
    switch (level) {
      case 'error':
        logger.error(category, `User action failed: ${action}`, logData, context);
        break;
      case 'warn':
        logger.warn(category, `User action: ${action}`, logData, context);
        break;
      default:
        logger.info(category, `User action: ${action}`, logData, context);
    }
  }

  public static logAuthentication(
    action: UserAction.LOGIN | UserAction.LOGOUT | UserAction.REGISTER | UserAction.TOKEN_REFRESH,
    success: boolean,
    context: UserActivityContext,
    additionalData?: Record<string, any>
  ): void {
    this.logUserAction(action, {
      action,
      success,
      ...additionalData
    }, context);
  }

  public static logFileOperation(
    action: UserAction.UPLOAD_FILE | UserAction.DELETE_FILE | UserAction.DOWNLOAD_FILE,
    fileName: string,
    fileSize?: number,
    success: boolean = true,
    context: UserActivityContext = {},
    errorMessage?: string
  ): void {
    this.logUserAction(action, {
      action,
      resource: fileName,
      fileSize,
      success,
      errorMessage
    }, context);
  }

  public static logImageTransform(
    style: string,
    success: boolean = true,
    duration?: number,
    context: UserActivityContext = {},
    errorMessage?: string
  ): void {
    this.logUserAction(UserAction.TRANSFORM_IMAGE, {
      action: UserAction.TRANSFORM_IMAGE,
      imageStyle: style,
      success,
      duration,
      errorMessage
    }, context);
  }

  public static logSubscriptionAction(
    action: UserAction.SUBSCRIBE | UserAction.CANCEL_SUBSCRIPTION | UserAction.UPGRADE_PLAN | UserAction.DOWNGRADE_PLAN,
    plan: string,
    success: boolean = true,
    context: UserActivityContext = {},
    additionalData?: Record<string, any>
  ): void {
    this.logUserAction(action, {
      action,
      subscriptionPlan: plan,
      success,
      ...additionalData
    }, context);
  }

  public static logPageView(
    pageUrl: string,
    context: UserActivityContext = {},
    additionalData?: Record<string, any>
  ): void {
    this.logUserAction(UserAction.PAGE_VIEW, {
      action: UserAction.PAGE_VIEW,
      pageUrl,
      ...additionalData
    }, context);
  }

  public static logFeatureAccess(
    featureName: string,
    success: boolean = true,
    context: UserActivityContext = {},
    additionalData?: Record<string, any>
  ): void {
    this.logUserAction(UserAction.FEATURE_ACCESS, {
      action: UserAction.FEATURE_ACCESS,
      featureName,
      success,
      ...additionalData
    }, context);
  }

  public static logSecurityEvent(
    action: UserAction.SUSPICIOUS_ACTIVITY | UserAction.RATE_LIMIT_EXCEEDED,
    details: Record<string, any>,
    context: UserActivityContext = {}
  ): void {
    this.logUserAction(action, {
      action,
      details,
      success: false
    }, context);
  }

  public static logError(
    action: UserAction,
    error: Error,
    context: UserActivityContext = {},
    additionalData?: Record<string, any>
  ): void {
    this.logUserAction(action, {
      action,
      success: false,
      errorMessage: error.message,
      details: {
        errorName: error.name,
        errorCode: (error as any).code,
        ...additionalData
      }
    }, context);
  }

  private static getCategoryForAction(action: UserAction): LogCategory {
    switch (action) {
      case UserAction.LOGIN:
      case UserAction.LOGOUT:
      case UserAction.REGISTER:
      case UserAction.TOKEN_REFRESH:
        return LogCategory.AUTH;
      
      case UserAction.UPLOAD_FILE:
      case UserAction.DELETE_FILE:
      case UserAction.DOWNLOAD_FILE:
        return LogCategory.UPLOAD;
      
      case UserAction.TRANSFORM_IMAGE:
      case UserAction.SELECT_STYLE:
        return LogCategory.TRANSFORM;
      
      case UserAction.SUBSCRIBE:
      case UserAction.CANCEL_SUBSCRIPTION:
      case UserAction.UPGRADE_PLAN:
      case UserAction.DOWNGRADE_PLAN:
        return LogCategory.BILLING;
      
      case UserAction.SUSPICIOUS_ACTIVITY:
      case UserAction.RATE_LIMIT_EXCEEDED:
        return LogCategory.SECURITY;
      
      case UserAction.PAGE_VIEW:
      case UserAction.FEATURE_ACCESS:
      case UserAction.UPDATE_PROFILE:
      case UserAction.CHANGE_PASSWORD:
      case UserAction.CONTACT_SUPPORT:
      case UserAction.FEEDBACK:
        return LogCategory.USER;
      
      default:
        return LogCategory.SYSTEM;
    }
  }
}

// Convenience functions for common use cases
export const logUserLogin = (userId: string, success: boolean, context: UserActivityContext) => {
  UserActivityLogger.logAuthentication(UserAction.LOGIN, success, { ...context, userId });
};

export const logUserLogout = (userId: string, context: UserActivityContext) => {
  UserActivityLogger.logAuthentication(UserAction.LOGOUT, true, { ...context, userId });
};

export const logFileUpload = (userId: string, fileName: string, fileSize: number, success: boolean, context: UserActivityContext) => {
  UserActivityLogger.logFileOperation(UserAction.UPLOAD_FILE, fileName, fileSize, success, { ...context, userId });
};

export const logImageTransform = (userId: string, style: string, success: boolean, duration: number, context: UserActivityContext) => {
  UserActivityLogger.logImageTransform(style, success, duration, { ...context, userId });
};

export const logSubscription = (userId: string, action: UserAction.SUBSCRIBE | UserAction.CANCEL_SUBSCRIPTION | UserAction.UPGRADE_PLAN | UserAction.DOWNGRADE_PLAN, plan: string, success: boolean, context: UserActivityContext) => {
  UserActivityLogger.logSubscriptionAction(action, plan, success, { ...context, userId });
};
