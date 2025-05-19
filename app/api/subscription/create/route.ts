import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/app/lib/stripe';
import { jwtVerify } from 'jose';

export async function POST(request: Request) {
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
    const userId = payload.userId as string;
    const email = payload.email as string;

    // Create Stripe checkout session
    const session = await createCheckoutSession(userId, email);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 