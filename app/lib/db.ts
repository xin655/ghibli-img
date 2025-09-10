import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug: Log all environment variables (excluding sensitive ones)
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI ? 'defined' : 'undefined',
});

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not defined in environment variables');
  // 在构建时不抛出错误，只在运行时检查
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
  }
}

// Log connection string (without password)
if (MONGODB_URI) {
  const sanitizedUri = MONGODB_URI.replace(/(mongodb:\/\/[^:]+:)([^@]+)@/, '$1****@');
  console.log('Connecting to MongoDB:', sanitizedUri);
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI is not defined, skipping database connection');
    return null;
  }
  
  if (cached.conn) {
    console.log('Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      // Connection options
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
      // MongoDB Atlas options
      retryWrites: true,
      // Additional options
      autoIndex: true,
      autoCreate: true,
    };

    // Add debug logging only in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }

    console.log('Attempting to connect to MongoDB with options:', opts);

    try {
      cached.promise = mongoose.connect(MONGODB_URI as string, opts)
        .then((mongoose) => {
          console.log('Successfully connected to MongoDB');
          return mongoose;
        })
        .catch((error) => {
          console.error('MongoDB connection error:', {
            name: error.name,
            message: error.message,
            code: error.code,
            codeName: error.codeName,
            stack: error.stack
          });
          throw error;
        });
    } catch (error) {
      console.error('Error during connection setup:', error);
      throw error;
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('Failed to establish MongoDB connection:', e);
    // 在构建时不抛出错误
    if (process.env.NODE_ENV === 'production' && !MONGODB_URI) {
      console.warn('Skipping database connection in production build without MONGODB_URI');
      return null;
    }
    throw e;
  }

  return cached.conn;
}

export default connectDB; 