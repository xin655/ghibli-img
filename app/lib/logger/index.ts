// Export all logging utilities
export { Logger, logger, LogLevel, LogCategory, type LogEntry, type LoggerConfig } from './Logger';
export { ApiLogger, withApiLogging, createApiLoggingMiddleware, type ApiLogContext } from './ApiLogger';
export { UserActivityLogger, UserAction, type UserActivityContext, type UserActivityData } from './UserActivityLogger';
export { PerformanceLogger, type PerformanceMetric, type DatabaseMetric, type ApiMetric, type FileOperationMetric } from './PerformanceLogger';

// Initialize logger with environment-based configuration
import { logger, LogLevel, LogCategory } from './Logger';

// Configure logger based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Set log level based on environment
if (isDevelopment) {
  logger.setLogLevel(LogLevel.DEBUG);
} else if (isProduction) {
  logger.setLogLevel(LogLevel.INFO);
} else {
  logger.setLogLevel(LogLevel.WARN);
}

// Configure logger settings
logger.setConfig({
  logDir: process.env.LOG_DIR || './logs',
  maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE !== 'false',
  datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD'
});

// Log system startup
logger.info(LogCategory.SYSTEM, 'Logging system initialized', {
  environment: process.env.NODE_ENV,
  logLevel: logger.getConfig().logLevel,
  logDir: logger.getConfig().logDir,
  enableConsole: logger.getConfig().enableConsole,
  enableFile: logger.getConfig().enableFile
});

export default logger;
