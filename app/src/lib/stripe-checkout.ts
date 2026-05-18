import type Stripe from 'stripe';
import { getAppUrl, getStripe } from '@/lib/stripe';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export type BakerPlan = 'monthly' | 'lifetime';

export async function createBakerPlanCheckout(
  bakerId: string,
  plan: BakerPlan,
  customerEmail?: string | null
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const appUrl = getAppUrl();
  const metadata = {
    baker_id: bakerId,
    checkout_type: plan === 'monthly' ? 'subscription_monthly' : 'subscription_lifetime',
  };

  if (plan === 'monthly') {
    const priceId = process.env.STRIPE_PRICE_MONTHLY;
    if (!priceId) {
      throw new Error('STRIPE_PRICE_MONTHLY is not configured');
    }
    return stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: customerEmail ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata: { baker_id: bakerId } },
      success_url: `${appUrl}/dashboard?billing=success&plan=monthly`,
      cancel_url: `${appUrl}/pricing?billing=cancelled`,
    });
  }

  const priceId = process.env.STRIPE_PRICE_LIFETIME;
  if (!priceId) {
    throw new Error('STRIPE_PRICE_LIFETIME is not configured');
  }
  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customerEmail ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata,
    success_url: `${appUrl}/dashboard?billing=success&plan=lifetime`,
    cancel_url: `${appUrl}/pricing?billing=cancelled`,
  });
}

export async function createOrderPaymentCheckout(
  bakerId: string,
  orderId: string
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const appUrl = getAppUrl();
  const admin = createSupabaseAdmin();

  const { data: order, error } = await admin
    .from('orders')
    .select('id, baker_id, customer_email, customer_name, total_price, is_paid')
    .eq('id', orderId)
    .eq('baker_id', bakerId)
    .single();

  if (error || !order) {
    throw new Error('Order not found');
  }
  if (order.is_paid) {
    throw new Error('Order is already paid');
  }

  const amountCents = Math.round(Number(order.total_price) * 100);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    throw new Error('Invalid order amount for checkout');
  }

  const label = order.customer_name
    ? `Order for ${order.customer_name}`
    : `Cake order #${orderId.slice(0, 8)}`;

  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: order.customer_email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: label },
        },
      },
    ],
    metadata: {
      baker_id: bakerId,
      checkout_type: 'order_payment',
      order_id: orderId,
    },
    success_url: `${appUrl}/dashboard/orders?payment=success&order_id=${orderId}`,
    cancel_url: `${appUrl}/dashboard/orders?payment=cancelled`,
  });
}
