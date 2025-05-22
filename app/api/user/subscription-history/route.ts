import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import connectDB from '@/app/lib/db';
import User, { IUserDocument } from '@/app/models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil', // Use the correct API version
});

export async function GET(request: Request) {
  console.log('Server: Entering /api/user/subscription-history GET function');

  try {
    const session = await getServerSession(authOptions);
    console.log('Server: /api/user/subscription-history - session:', session);

    if (!session || !session.user?.email) {
      console.log('Server: Authentication required - No valid session found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      console.log('Server: User not found in DB for email:', session.user.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.subscription?.stripeCustomerId) {
      console.log('Server: User does not have a Stripe Customer ID:', user.email);
      return NextResponse.json(
        { history: [], message: 'No Stripe customer ID found for user.' },
        { status: 200 }
      );
    }

    console.log('Server: Fetching subscription history for Stripe Customer ID:', user.subscription.stripeCustomerId);

    // Fetch subscriptions from Stripe for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: user.subscription.stripeCustomerId,
      limit: 10, // Limit, adjust as needed
      // You might want to filter by status if needed, e.g., status: 'all' or ['active', 'canceled', 'ended']
    });

    console.log(`Server: Found ${subscriptions.data.length} subscriptions for user`);

    // You might want to fetch related invoices or other details here if needed

    return NextResponse.json({ history: subscriptions.data });

  } catch (error) {
    console.error('Server: Error fetching subscription history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription history' },
      { status: 500 }
    );
  }
} 