import Stripe from 'stripe';
import { kv } from '@vercel/kv';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

if (!process.env.STRIPE_PRICE_ID) {
  throw new Error('Missing STRIPE_PRICE_ID');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
});

export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID;

export async function createCheckoutSession(userId: string, email: string) {
  if (!SUBSCRIPTION_PRICE_ID) {
    throw new Error('Missing STRIPE_PRICE_ID');
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: [
      {
        price: SUBSCRIPTION_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-cancel`,
    metadata: {
      userId,
    },
  });

  return session;
}

export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account`,
  });

  return session;
}

export async function handleSubscriptionChange(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription & {
    current_period_end: number;
  };
  const customerId = subscription.customer as string;

  // Update user's subscription status in your database
  // This is where you would update your user's subscription status
  // based on the event type (created, updated, deleted, etc.)
  console.log('Subscription changed:', {
    customerId,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      });
} 