import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';

export async function GET() {
  try {
    // Connect to database
    await connectDB();
    
    // Create a test user
    const testUser = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      photo: 'https://example.com/photo.jpg',
      googleId: 'test123',
      subscription: {
        status: 'free',
        plan: 'free',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      usage: {
        freeTrialsRemaining: 3,
        totalTransformations: 0,
      },
    });

    // Get all users count
    const userCount = await User.countDocuments();

    // Delete the test user
    await User.deleteOne({ email: 'test@example.com' });

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      data: {
        totalUsers: userCount,
        testUserCreated: true,
        testUserDeleted: true,
      },
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 