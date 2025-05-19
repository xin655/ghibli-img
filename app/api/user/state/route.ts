import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getUserState } from '@/app/lib/userState';

export async function GET(request: Request) {
  try {
    // Get the token from the Authorization header
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the token
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    const { payload } = await jwtVerify(token, secret);
    const googleId = payload.userId as string; // JWT payload contains Google ID

    // Get user state
    const userState = await getUserState(googleId);

    if (!userState) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return the user state
    return NextResponse.json(userState);

  } catch (error) {
    console.error('Get user state error:', error);
    return NextResponse.json(
      { error: 'Failed to get user state' },
      { status: 500 }
    );
  }
} 