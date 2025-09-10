import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export enum LogCategory {
  API = 'api',
  AUTH = 'auth',
  BILLING = 'billing',
  UPLOAD = 'upload',
  TRANSFORM = 'transform',
  USER = 'user',
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  logDir: string;
  maxFileSize: number; // bytes
  maxFiles: number;
  enableConsole: boolean;
  enableFile: boolean;
  logLevel: LogLevel;
  datePattern: string;
}

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logDir: string;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      logDir: config.logDir || './logs',
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: config.maxFiles || 5,
      enableConsole: config.enableConsole ?? true,
      enableFile: config.enableFile ?? true,
      logLevel: config.logLevel || LogLevel.INFO,
      datePattern: config.datePattern || 'YYYY-MM-DD'
    };

    this.logDir = path.resolve(this.config.logDir);
    this.ensureLogDirectory();
  }

  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.TRACE];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, category, message, data, userId, sessionId, requestId, ip, userAgent, duration, error, metadata } = entry;
    
    const logObject = {
      timestamp,
      level: level.toUpperCase(),
      category: category.toUpperCase(),
      message,
      ...(userId && { userId }),
      ...(sessionId && { sessionId }),
      ...(requestId && { requestId }),
      ...(ip && { ip }),
      ...(userAgent && { userAgent }),
      ...(duration !== undefined && { duration: `${duration}ms` }),
      ...(error && { error }),
      ...(data && { data }),
      ...(metadata && { metadata })
    };

    return JSON.stringify(logObject, null, 2);
  }

  private getLogFileName(category: LogCategory, level: LogLevel): string {
    const date = new Date().toISOString().split('T')[0];
    return `${category}-${level}-${date}.log`;
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.config.enableFile) return;

    try {
      const fileName = this.getLogFileName(entry.category, entry.level);
      const filePath = path.join(this.logDir, fileName);
      const logLine = this.formatLogEntry(entry) + '\n';

      fs.appendFileSync(filePath, logLine, 'utf8');
      this.rotateLogIfNeeded(filePath);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const { level, category, message, data, error } = entry;
    const timestamp = new Date().toISOString();
    
    const colors = {
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.INFO]: '\x1b[36m',  // Cyan
      [LogLevel.DEBUG]: '\x1b[35m', // Magenta
      [LogLevel.TRACE]: '\x1b[37m'  // White
    };

    const resetColor = '\x1b[0m';
    const color = colors[level] || resetColor;
    
    console.log(`${color}[${timestamp}] ${level.toUpperCase()} [${category.toUpperCase()}] ${message}${resetColor}`);
    
    if (data) {
      console.log(`${color}Data:${resetColor}`, data);
    }
    
    if (error) {
      console.error(`${color}Error:${resetColor}`, error);
    }
  }

  private rotateLogIfNeeded(filePath: string): void {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > this.config.maxFileSize) {
        this.rotateLogFile(filePath);
      }
    } catch (error) {
      // File doesn't exist or other error, ignore
    }
  }

  private rotateLogFile(filePath: string): void {
    try {
      const dir = path.dirname(filePath);
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);
      
      // Move existing files
      for (let i = this.config.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(dir, `${baseName}.${i}${ext}`);
        const newFile = path.join(dir, `${baseName}.${i + 1}${ext}`);
        
        if (fs.existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // Move current file to .1
      const rotatedFile = path.join(dir, `${baseName}.1${ext}`);
      fs.renameSync(filePath, rotatedFile);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private log(level: LogLevel, category: LogCategory, message: string, data?: any, context?: Partial<LogEntry>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      ...context
    };

    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  // Public logging methods
  public error(category: LogCategory, message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.ERROR, category, message, data, context);
  }

  public warn(category: LogCategory, message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.WARN, category, message, data, context);
  }

  public info(category: LogCategory, message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.INFO, category, message, data, context);
  }

  public debug(category: LogCategory, message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.DEBUG, category, message, data, context);
  }

  public trace(category: LogCategory, message: string, data?: any, context?: Partial<LogEntry>): void {
    this.log(LogLevel.TRACE, category, message, data, context);
  }

  // Convenience methods for common scenarios
  public logApiRequest(method: string, url: string, statusCode: number, duration: number, context?: Partial<LogEntry>): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, LogCategory.API, `${method} ${url} - ${statusCode}`, {
      method,
      url,
      statusCode,
      duration
    }, context);
  }

  public logUserAction(action: string, userId: string, data?: any, context?: Partial<LogEntry>): void {
    this.info(LogCategory.USER, `User action: ${action}`, data, { userId, ...context });
  }

  public logError(error: Error, category: LogCategory, context?: Partial<LogEntry>): void {
    this.error(category, error.message, undefined, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      },
      ...context
    });
  }

  public logSecurity(event: string, data?: any, context?: Partial<LogEntry>): void {
    this.warn(LogCategory.SECURITY, `Security event: ${event}`, data, context);
  }

  public logPerformance(operation: string, duration: number, data?: any, context?: Partial<LogEntry>): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, LogCategory.PERFORMANCE, `Performance: ${operation}`, {
      operation,
      duration,
      ...data
    }, context);
  }

  // Configuration methods
  public setLogLevel(level: LogLevel): void {
    this.config.logLevel = level;
  }

  public setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.logDir) {
      this.logDir = path.resolve(config.logDir);
      this.ensureLogDirectory();
    }
  }

  public getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
