import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/db';
import User from '@/app/models/User';

export const runtime = 'nodejs';

// Initialize Stripe client (lazy initialization)
let stripe: Stripe | null = null;

function getStripe() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(secretKey);
  }
  return stripe;
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { userId: string };
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET environment variable is not set');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      decoded = jwt.verify(token, jwtSecret) as { userId: string };
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(decoded.userId);
    
    if (!user?.subscription?.stripeCustomerId) {
      return NextResponse.json({ error: 'Stripe customer missing' }, { status: 400 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: user.subscription.stripeCustomerId,
      return_url: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error('portal error', e);
    return NextResponse.json({ error: 'Portal session error' }, { status: 500 });
  }
}


