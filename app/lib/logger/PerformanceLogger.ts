import { logger, LogCategory } from './Logger';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  startTime: number;
  endTime: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface DatabaseMetric extends PerformanceMetric {
  query?: string;
  table?: string;
  rowsAffected?: number;
  connectionTime?: number;
}

export interface ApiMetric extends PerformanceMetric {
  method: string;
  url: string;
  statusCode: number;
  requestSize?: number;
  responseSize?: number;
}

export interface FileOperationMetric extends PerformanceMetric {
  fileName: string;
  fileSize: number;
  operation: 'upload' | 'download' | 'delete' | 'transform';
}

export class PerformanceLogger {
  private static thresholds = {
    api: 1000,        // 1 second
    database: 500,    // 500ms
    file: 2000,       // 2 seconds
    transform: 10000, // 10 seconds
    default: 1000     // 1 second
  };

  public static logApiPerformance(
    method: string,
    url: string,
    duration: number,
    statusCode: number,
    requestSize?: number,
    responseSize?: number,
    metadata?: Record<string, any>
  ): void {
    const metric: ApiMetric = {
      operation: `${method} ${url}`,
      duration,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      success: statusCode < 400,
      method,
      url,
      statusCode,
      requestSize,
      responseSize,
      metadata
    };

    this.logPerformanceMetric(metric, 'api');
  }

  public static logDatabasePerformance(
    operation: string,
    duration: number,
    query?: string,
    table?: string,
    rowsAffected?: number,
    connectionTime?: number,
    metadata?: Record<string, any>
  ): void {
    const metric: DatabaseMetric = {
      operation,
      duration,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      success: true, // Assume success unless explicitly marked as failed
      query,
      table,
      rowsAffected,
      connectionTime,
      metadata
    };

    this.logPerformanceMetric(metric, 'database');
  }

  public static logFileOperationPerformance(
    operation: 'upload' | 'download' | 'delete' | 'transform',
    fileName: string,
    fileSize: number,
    duration: number,
    success: boolean = true,
    metadata?: Record<string, any>
  ): void {
    const metric: FileOperationMetric = {
      operation,
      duration,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      success,
      fileName,
      fileSize,
      metadata
    };

    this.logPerformanceMetric(metric, 'file');
  }

  public static logImageTransformPerformance(
    style: string,
    duration: number,
    success: boolean = true,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operation: `transform_${style}`,
      duration,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      success,
      metadata: {
        style,
        ...metadata
      }
    };

    this.logPerformanceMetric(metric, 'transform');
  }

  public static logCustomPerformance(
    operation: string,
    duration: number,
    success: boolean = true,
    category: 'api' | 'database' | 'file' | 'transform' | 'default' = 'default',
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      success,
      metadata
    };

    this.logPerformanceMetric(metric, category);
  }

  private static logPerformanceMetric(
    metric: PerformanceMetric,
    category: 'api' | 'database' | 'file' | 'transform' | 'default'
  ): void {
    const threshold = this.thresholds[category];
    const isSlow = metric.duration > threshold;
    const isError = !metric.success;

    // Determine log level
    let logLevel: 'info' | 'warn' | 'error' = 'info';
    if (isError) {
      logLevel = 'error';
    } else if (isSlow) {
      logLevel = 'warn';
    }

    // Create log data
    const logData = {
      operation: metric.operation,
      duration: metric.duration,
      threshold,
      isSlow,
      isError,
      startTime: new Date(metric.startTime).toISOString(),
      endTime: new Date(metric.endTime).toISOString(),
      ...metric.metadata
    };

    // Add category-specific data
    if ('method' in metric) {
      logData.method = (metric as ApiMetric).method;
      logData.url = (metric as ApiMetric).url;
      logData.statusCode = (metric as ApiMetric).statusCode;
      if ((metric as ApiMetric).requestSize) logData.requestSize = (metric as ApiMetric).requestSize;
      if ((metric as ApiMetric).responseSize) logData.responseSize = (metric as ApiMetric).responseSize;
    }

    if ('query' in metric) {
      logData.query = (metric as DatabaseMetric).query;
      logData.table = (metric as DatabaseMetric).table;
      logData.rowsAffected = (metric as DatabaseMetric).rowsAffected;
      if ((metric as DatabaseMetric).connectionTime) logData.connectionTime = (metric as DatabaseMetric).connectionTime;
    }

    if ('fileName' in metric) {
      logData.fileName = (metric as FileOperationMetric).fileName;
      logData.fileSize = (metric as FileOperationMetric).fileSize;
    }

    // Log based on level
    switch (logLevel) {
      case 'error':
        logger.error(LogCategory.PERFORMANCE, `Performance error: ${metric.operation}`, logData);
        break;
      case 'warn':
        logger.warn(LogCategory.PERFORMANCE, `Slow operation: ${metric.operation}`, logData);
        break;
      default:
        logger.info(LogCategory.PERFORMANCE, `Performance: ${metric.operation}`, logData);
    }
  }

  public static setThreshold(
    category: 'api' | 'database' | 'file' | 'transform' | 'default',
    threshold: number
  ): void {
    this.thresholds[category] = threshold;
  }

  public static getThresholds(): typeof PerformanceLogger.thresholds {
    return { ...this.thresholds };
  }

  // Utility function to measure and log performance
  public static async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    category: 'api' | 'database' | 'file' | 'transform' | 'default' = 'default',
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let result: T;

    try {
      result = await fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logCustomPerformance(operation, duration, success, category, metadata);
    }

    return result;
  }

  // Synchronous version
  public static measurePerformanceSync<T>(
    operation: string,
    fn: () => T,
    category: 'api' | 'database' | 'file' | 'transform' | 'default' = 'default',
    metadata?: Record<string, any>
  ): T {
    const startTime = Date.now();
    let success = true;
    let result: T;

    try {
      result = fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.logCustomPerformance(operation, duration, success, category, metadata);
    }

    return result;
  }
}
