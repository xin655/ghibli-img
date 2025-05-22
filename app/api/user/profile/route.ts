import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/authOptions';
import connectDB from '@/app/lib/db';
import UserCollection from '@/app/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    await connectDB();
    const user = await UserCollection.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      subscription: user.subscription,
      isSubscribed: user.subscription.status === 'active',
      subscriptionExpiresAt: user.subscription.endDate ? Math.floor(user.subscription.endDate.getTime() / 1000) : undefined,
      stripeCustomerId: user.subscription.stripeCustomerId,
      freeTrialsRemaining: user.usage.freeTrialsRemaining,
      totalTransformations: user.usage.totalTransformations,
      createdAt: Math.floor(user.createdAt.getTime() / 1000),
      updatedAt: Math.floor(user.updatedAt.getTime() / 1000),
      lastLoginAt: user.lastLoginAt ? Math.floor(user.lastLoginAt.getTime() / 1000) : undefined,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 