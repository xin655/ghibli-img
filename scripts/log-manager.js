#!/usr/bin/env node

/**
 * 日志管理工具
 * 用于日志分析、清理、统计等功能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LogManager {
  constructor(logDir = './logs') {
    this.logDir = path.resolve(logDir);
  }

  // 分析日志统计信息
  analyzeLogs() {
    console.log('📊 日志分析报告\n');
    
    if (!fs.existsSync(this.logDir)) {
      console.log('❌ 日志目录不存在:', this.logDir);
      return;
    }

    const files = fs.readdirSync(this.logDir).filter(file => file.endsWith('.log'));
    
    if (files.length === 0) {
      console.log('📝 暂无日志文件');
      return;
    }

    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      categories: {},
      levels: {},
      errors: 0,
      warnings: 0,
      recentActivity: []
    };

    files.forEach(file => {
      const filePath = path.join(this.logDir, file);
      const stat = fs.statSync(filePath);
      stats.totalSize += stat.size;

      // 解析文件名获取分类和级别
      const parts = file.replace('.log', '').split('-');
      if (parts.length >= 2) {
        const category = parts[0];
        const level = parts[1];
        
        stats.categories[category] = (stats.categories[category] || 0) + 1;
        stats.levels[level] = (stats.levels[level] || 0) + 1;
      }

      // 分析最近的错误和警告
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        lines.slice(-10).forEach(line => {
          try {
            const logEntry = JSON.parse(line);
            if (logEntry.level === 'ERROR') stats.errors++;
            if (logEntry.level === 'WARN') stats.warnings++;
            
            stats.recentActivity.push({
              timestamp: logEntry.timestamp,
              level: logEntry.level,
              category: logEntry.category,
              message: logEntry.message
            });
          } catch (e) {
            // 忽略解析错误
          }
        });
      } catch (e) {
        console.warn('⚠️  无法读取文件:', file);
      }
    });

    // 显示统计信息
    console.log('📁 文件统计:');
    console.log(`   总文件数: ${stats.totalFiles}`);
    console.log(`   总大小: ${this.formatBytes(stats.totalSize)}`);
    console.log('');

    console.log('📂 分类统计:');
    Object.entries(stats.categories).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} 个文件`);
    });
    console.log('');

    console.log('📊 级别统计:');
    Object.entries(stats.levels).forEach(([level, count]) => {
      console.log(`   ${level}: ${count} 个文件`);
    });
    console.log('');

    console.log('⚠️  最近活动:');
    console.log(`   错误: ${stats.errors} 条`);
    console.log(`   警告: ${stats.warnings} 条`);
    console.log('');

    // 显示最近的日志条目
    if (stats.recentActivity.length > 0) {
      console.log('🕒 最近日志条目:');
      stats.recentActivity
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5)
        .forEach(entry => {
          const time = new Date(entry.timestamp).toLocaleString();
          console.log(`   [${time}] ${entry.level} [${entry.category}] ${entry.message}`);
        });
    }
  }

  // 清理旧日志
  cleanLogs(days = 7) {
    console.log(`🧹 清理 ${days} 天前的日志文件...\n`);
    
    if (!fs.existsSync(this.logDir)) {
      console.log('❌ 日志目录不存在:', this.logDir);
      return;
    }

    const files = fs.readdirSync(this.logDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let cleanedCount = 0;
    let cleanedSize = 0;

    files.forEach(file => {
      const filePath = path.join(this.logDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.mtime < cutoffDate) {
        cleanedSize += stat.size;
        fs.unlinkSync(filePath);
        cleanedCount++;
        console.log(`🗑️  删除: ${file} (${this.formatBytes(stat.size)})`);
      }
    });

    console.log(`\n✅ 清理完成:`);
    console.log(`   删除文件: ${cleanedCount} 个`);
    console.log(`   释放空间: ${this.formatBytes(cleanedSize)}`);
  }

  // 压缩日志文件
  compressLogs() {
    console.log('📦 压缩日志文件...\n');
    
    if (!fs.existsSync(this.logDir)) {
      console.log('❌ 日志目录不存在:', this.logDir);
      return;
    }

    const files = fs.readdirSync(this.logDir).filter(file => 
      file.endsWith('.log') && !file.endsWith('.gz')
    );

    if (files.length === 0) {
      console.log('📝 没有需要压缩的日志文件');
      return;
    }

    let compressedCount = 0;
    let originalSize = 0;
    let compressedSize = 0;

    files.forEach(file => {
      const filePath = path.join(this.logDir, file);
      const stat = fs.statSync(filePath);
      originalSize += stat.size;

      try {
        execSync(`gzip "${filePath}"`, { stdio: 'pipe' });
        const compressedPath = filePath + '.gz';
        const compressedStat = fs.statSync(compressedPath);
        compressedSize += compressedStat.size;
        compressedCount++;
        
        const ratio = ((stat.size - compressedStat.size) / stat.size * 100).toFixed(1);
        console.log(`📦 压缩: ${file} (${this.formatBytes(stat.size)} → ${this.formatBytes(compressedStat.size)}, 压缩率: ${ratio}%)`);
      } catch (e) {
        console.warn(`⚠️  压缩失败: ${file}`);
      }
    });

    console.log(`\n✅ 压缩完成:`);
    console.log(`   压缩文件: ${compressedCount} 个`);
    console.log(`   原始大小: ${this.formatBytes(originalSize)}`);
    console.log(`   压缩后大小: ${this.formatBytes(compressedSize)}`);
    console.log(`   节省空间: ${this.formatBytes(originalSize - compressedSize)}`);
  }

  // 搜索日志
  searchLogs(query, options = {}) {
    const { level, category, limit = 50 } = options;
    
    console.log(`🔍 搜索日志: "${query}"\n`);
    
    if (!fs.existsSync(this.logDir)) {
      console.log('❌ 日志目录不存在:', this.logDir);
      return;
    }

    const files = fs.readdirSync(this.logDir).filter(file => file.endsWith('.log'));
    const results = [];

    files.forEach(file => {
      // 根据级别和分类过滤文件
      if (level && !file.includes(`-${level}-`)) return;
      if (category && !file.startsWith(`${category}-`)) return;

      const filePath = path.join(this.logDir, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          try {
            const logEntry = JSON.parse(line);
            
            // 搜索匹配的日志条目
            if (this.matchesQuery(logEntry, query)) {
              results.push({
                file,
                ...logEntry
              });
            }
          } catch (e) {
            // 忽略解析错误
          }
        });
      } catch (e) {
        console.warn('⚠️  无法读取文件:', file);
      }
    });

    // 按时间排序并限制结果数量
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedResults = results.slice(0, limit);

    console.log(`📋 找到 ${results.length} 条匹配记录 (显示前 ${limitedResults.length} 条):\n`);

    limitedResults.forEach((entry, index) => {
      const time = new Date(entry.timestamp).toLocaleString();
      console.log(`${index + 1}. [${time}] ${entry.level} [${entry.category}] ${entry.message}`);
      if (entry.data) {
        console.log(`   数据: ${JSON.stringify(entry.data, null, 2)}`);
      }
      if (entry.error) {
        console.log(`   错误: ${entry.error.message}`);
      }
      console.log('');
    });
  }

  // 监控实时日志
  monitorLogs(category = null, level = null) {
    console.log('👀 开始监控日志... (按 Ctrl+C 停止)\n');
    
    if (!fs.existsSync(this.logDir)) {
      console.log('❌ 日志目录不存在:', this.logDir);
      return;
    }

    const files = fs.readdirSync(this.logDir).filter(file => {
      if (!file.endsWith('.log')) return false;
      if (level && !file.includes(`-${level}-`)) return false;
      if (category && !file.startsWith(`${category}-`)) return false;
      return true;
    });

    if (files.length === 0) {
      console.log('📝 没有匹配的日志文件');
      return;
    }

    console.log(`📁 监控文件: ${files.join(', ')}\n`);

    // 记录文件大小，用于检测新内容
    const fileSizes = {};
    files.forEach(file => {
      const filePath = path.join(this.logDir, file);
      try {
        fileSizes[file] = fs.statSync(filePath).size;
      } catch (e) {
        fileSizes[file] = 0;
      }
    });

    // 定期检查文件变化
    const interval = setInterval(() => {
      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        try {
          const currentSize = fs.statSync(filePath).size;
          const lastSize = fileSizes[file] || 0;
          
          if (currentSize > lastSize) {
            // 读取新增内容
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(currentSize - lastSize);
            fs.readSync(fd, buffer, 0, buffer.length, lastSize);
            fs.closeSync(fd);
            
            const newContent = buffer.toString('utf8');
            const lines = newContent.split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
              try {
                const logEntry = JSON.parse(line);
                const time = new Date(logEntry.timestamp).toLocaleTimeString();
                console.log(`[${time}] ${logEntry.level} [${logEntry.category}] ${logEntry.message}`);
              } catch (e) {
                // 忽略解析错误
              }
            });
            
            fileSizes[file] = currentSize;
          }
        } catch (e) {
          // 忽略文件访问错误
        }
      });
    }, 1000);

    // 处理退出信号
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log('\n👋 停止监控');
      process.exit(0);
    });
  }

  // 辅助方法
  matchesQuery(logEntry, query) {
    const searchText = [
      logEntry.message,
      logEntry.category,
      logEntry.level,
      JSON.stringify(logEntry.data || {}),
      JSON.stringify(logEntry.metadata || {})
    ].join(' ').toLowerCase();
    
    return searchText.includes(query.toLowerCase());
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 命令行接口
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const logManager = new LogManager();

  switch (command) {
    case 'analyze':
      logManager.analyzeLogs();
      break;
    
    case 'clean':
      const days = parseInt(args[1]) || 7;
      logManager.cleanLogs(days);
      break;
    
    case 'compress':
      logManager.compressLogs();
      break;
    
    case 'search':
      const query = args[1];
      if (!query) {
        console.log('❌ 请提供搜索查询');
        process.exit(1);
      }
      const options = {};
      if (args[2]) options.level = args[2];
      if (args[3]) options.category = args[3];
      if (args[4]) options.limit = parseInt(args[4]);
      logManager.searchLogs(query, options);
      break;
    
    case 'monitor':
      const category = args[1] || null;
      const level = args[2] || null;
      logManager.monitorLogs(category, level);
      break;
    
    default:
      console.log(`
📋 日志管理工具使用说明

用法: node scripts/log-manager.js <command> [options]

命令:
  analyze                   分析日志统计信息
  clean [days]             清理指定天数前的日志 (默认7天)
  compress                 压缩日志文件
  search <query> [level] [category] [limit]  搜索日志
  monitor [category] [level]  实时监控日志

示例:
  node scripts/log-manager.js analyze
  node scripts/log-manager.js clean 30
  node scripts/log-manager.js compress
  node scripts/log-manager.js search "error" ERROR API 20
  node scripts/log-manager.js monitor API INFO
      `);
  }
}

if (require.main === module) {
  main();
}

module.exports = LogManager;
