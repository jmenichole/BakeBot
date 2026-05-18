import type Stripe from 'stripe';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

async function activateBakerPremium(
  bakerId: string,
  planType: 'monthly' | 'lifetime',
  subscriptionId: string | null
) {
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from('bakers')
    .update({
      is_premium: true,
      plan_type: planType,
      subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bakerId);

  if (error) {
    throw new Error(`Failed to activate premium: ${error.message}`);
  }
}

async function markOrderPaid(orderId: string, amountTotal: number | null) {
  const admin = createSupabaseAdmin();
  const deposit =
    amountTotal != null ? Math.round(amountTotal) / 100 : undefined;

  const { error } = await admin
    .from('orders')
    .update({
      is_paid: true,
      ...(deposit !== undefined ? { deposit_paid: deposit } : {}),
      status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    throw new Error(`Failed to mark order paid: ${error.message}`);
  }
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const checkoutType = session.metadata?.checkout_type;
  const bakerId = session.metadata?.baker_id;
  const orderId = session.metadata?.order_id;

  if (checkoutType === 'order_payment' && orderId) {
    await markOrderPaid(orderId, session.amount_total);
    return;
  }

  if (!bakerId) {
    console.warn('checkout.session.completed without baker_id', session.id);
    return;
  }

  if (checkoutType === 'subscription_monthly') {
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;
    await activateBakerPremium(bakerId, 'monthly', subscriptionId);
    return;
  }

  if (checkoutType === 'subscription_lifetime') {
    await activateBakerPremium(bakerId, 'lifetime', null);
  }
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const bakerId = subscription.metadata?.baker_id;
  if (!bakerId) return;

  const admin = createSupabaseAdmin();
  await admin
    .from('bakers')
    .update({
      is_premium: false,
      plan_type: 'trial',
      subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bakerId)
    .eq('subscription_id', subscription.id);
}
