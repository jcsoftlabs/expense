import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is missing.');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://devfinance-lyart.vercel.app';
}

export function toStripeAmount(amount: number, currency: string) {
  const normalized = currency.toLowerCase();

  // USD and HTG are two-decimal currencies in Stripe's API.
  if (normalized === 'usd' || normalized === 'htg') {
    return Math.round(amount * 100);
  }

  return Math.round(amount * 100);
}
