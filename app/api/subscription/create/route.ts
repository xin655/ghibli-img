import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/app/lib/stripe';
import { jwtVerify } from 'jose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';

export async function POST(request: Request) {
  console.log('Server: Entering subscription create route POST function');
  try {
    // Use getServerSession to get the user session
    const session = await getServerSession(authOptions);
    console.log('Server: subscription create route - session:', session);

    if (!session || !session.user || !session.user.id || !session.user.email) {
      console.log('Server: Authentication required - No valid session found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract userId and email from the NextAuth session
    const userId = session.user.id;
    const email = session.user.email;

    console.log(`Server: Authenticated user: userId=${userId}, email=${email}`);

    // Create Stripe checkout session using userId and email from session
    const stripeSession = await createCheckoutSession(userId, email);

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error('Server: Create subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 