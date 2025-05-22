import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import connectDB from '@/app/lib/db';
import User, { IUserDocument } from '@/app/models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  console.log('Server: Entering /api/user/invoices GET function');

  try {
    const session = await getServerSession(authOptions);
    console.log('Server: /api/user/invoices - session:', session);

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
       // This could happen for users who haven't subscribed before
      return NextResponse.json(
        { invoices: [], message: 'No Stripe customer ID found for user.' }, // Return empty array and message
        { status: 200 }
      );
    }

    console.log('Server: Fetching invoices for Stripe Customer ID:', user.subscription.stripeCustomerId);

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: user.subscription.stripeCustomerId,
      limit: 10, // Limit to the last 10 invoices, adjust as needed
    });

    console.log(`Server: Found ${invoices.data.length} invoices for user`);

    return NextResponse.json({ invoices: invoices.data });

  } catch (error) {
    console.error('Server: Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
} 