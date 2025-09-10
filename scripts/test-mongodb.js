#!/usr/bin/env node

/**
 * MongoDB连接测试脚本
 * 用于测试MongoDB连接是否正常
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 MongoDB连接测试开始...\n');

// 显示连接信息（隐藏密码）
if (MONGODB_URI) {
  const sanitizedUri = MONGODB_URI.replace(/(mongodb:\/\/[^:]+:)([^@]+)@/, '$1****@');
  console.log('📋 连接字符串:', sanitizedUri);
} else {
  console.log('❌ MONGODB_URI 未定义');
  process.exit(1);
}

// 解析连接字符串
const url = new URL(MONGODB_URI);
console.log('📋 解析信息:');
console.log('   协议:', url.protocol);
console.log('   主机:', url.hostname);
console.log('   端口:', url.port || '默认');
console.log('   数据库:', url.pathname.substring(1) || '默认');
console.log('   用户名:', url.username);
console.log('   密码:', url.password ? '****' : '未设置');
console.log('   参数:', url.search);

// 设置连接选项
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
  retryWrites: true,
  autoIndex: true,
  autoCreate: true,
};

console.log('\n🔧 连接选项:', JSON.stringify(options, null, 2));

// 测试连接
async function testConnection() {
  try {
    console.log('\n🚀 开始连接测试...');
    
    // 设置连接事件监听
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB连接成功');
    });
    
    mongoose.connection.on('error', (error) => {
      console.log('❌ MongoDB连接错误:', error.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB连接断开');
    });
    
    // 尝试连接
    await mongoose.connect(MONGODB_URI, options);
    
    console.log('✅ 连接测试成功！');
    
    // 测试基本操作
    console.log('\n🧪 测试基本操作...');
    
    // 测试数据库列表
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    console.log('📋 可用数据库:', dbs.databases.map(db => db.name));
    
    // 测试集合操作
    const testCollection = mongoose.connection.db.collection('test_connection');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('✅ 插入测试成功');
    
    const count = await testCollection.countDocuments();
    console.log('✅ 查询测试成功，文档数量:', count);
    
    await testCollection.deleteMany({ test: true });
    console.log('✅ 删除测试成功');
    
    console.log('\n🎉 所有测试通过！MongoDB连接正常。');
    
  } catch (error) {
    console.log('\n❌ 连接测试失败:');
    console.log('   错误类型:', error.name);
    console.log('   错误代码:', error.code);
    console.log('   错误信息:', error.message);
    
    if (error.code === 8000) {
      console.log('\n💡 认证失败的可能原因:');
      console.log('   1. 用户名或密码错误');
      console.log('   2. 用户没有访问权限');
      console.log('   3. 数据库用户被禁用');
      console.log('   4. 连接字符串格式错误');
    } else if (error.code === 6) {
      console.log('\n💡 连接失败的可能原因:');
      console.log('   1. 网络连接问题');
      console.log('   2. MongoDB服务器未运行');
      console.log('   3. 防火墙阻止连接');
      console.log('   4. 主机名或端口错误');
    }
    
    console.log('\n🔧 建议的解决方案:');
    console.log('   1. 检查MongoDB Atlas控制台中的用户设置');
    console.log('   2. 确认用户名和密码正确');
    console.log('   3. 检查IP白名单设置');
    console.log('   4. 验证连接字符串格式');
    
  } finally {
    // 关闭连接
    await mongoose.disconnect();
    console.log('\n🔌 连接已关闭');
    process.exit(0);
  }
}

// 运行测试
testConnection().catch(console.error);

