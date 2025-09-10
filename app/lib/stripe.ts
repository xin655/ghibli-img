import Stripe from 'stripe';

// Initialize Stripe client (lazy initialization)
let stripe: Stripe | null = null;

export function getStripe() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(secretKey);
  }
  return stripe;
}

export default getStripe;
