import Stripe from 'stripe';
import { kv } from '@vercel/kv';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID;

export async function createCheckoutSession(userId: string, email: string) {
  if (!SUBSCRIPTION_PRICE_ID) {
    throw new Error('Missing STRIPE_PRICE_ID');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: SUBSCRIPTION_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/cancel`,
    customer_email: email,
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
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata.userId;

  if (!userId) {
    throw new Error('No userId in subscription metadata');
  }

  const userState = await kv.get(`user:${userId}`);
  if (!userState) {
    throw new Error('User state not found');
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await kv.set(`user:${userId}`, {
        ...userState,
        isSubscribed: true,
        subscriptionExpiresAt: subscription.current_period_end * 1000,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
      });
      break;

    case 'customer.subscription.deleted':
      await kv.set(`user:${userId}`, {
        ...userState,
        isSubscribed: false,
        subscriptionExpiresAt: undefined,
        stripeCustomerId: undefined,
        stripeSubscriptionId: undefined,
      });
      break;
  }
} 