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
  console.error('MONGODB_URI is not defined in environment variables');
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

// Log connection string (without password)
const sanitizedUri = MONGODB_URI.replace(/(mongodb:\/\/[^:]+:)([^@]+)@/, '$1****@');
console.log('Connecting to MongoDB:', sanitizedUri);

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
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
      // DocumentDB specific options
      retryWrites: false,
      tls: true,
      tlsAllowInvalidCertificates: true,
      // DNS resolution options
      family: 4,
      directConnection: false,
      // Additional options
      autoIndex: true,
      autoCreate: true,
    };

    // Add debug logging
    mongoose.set('debug', true);

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
    throw e;
  }

  return cached.conn;
}

export default connectDB; 