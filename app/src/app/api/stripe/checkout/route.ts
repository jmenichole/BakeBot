import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  createBakerPlanCheckout,
  createOrderPaymentCheckout,
  type BakerPlan,
} from '@/lib/stripe-checkout';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, orderId } = body as { type?: string; orderId?: string };

    if (type === 'monthly' || type === 'lifetime') {
      const session = await createBakerPlanCheckout(
        user.id,
        type as BakerPlan,
        user.email
      );
      if (!session.url) {
        return NextResponse.json(
          { error: 'Failed to create checkout session' },
          { status: 500 }
        );
      }
      return NextResponse.json({ url: session.url });
    }

    if (type === 'order') {
      if (!orderId) {
        return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
      }
      const session = await createOrderPaymentCheckout(user.id, orderId);
      if (!session.url) {
        return NextResponse.json(
          { error: 'Failed to create checkout session' },
          { status: 500 }
        );
      }
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: 'Invalid checkout type' }, { status: 400 });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    const message =
      err instanceof Error ? err.message : 'Checkout failed';
    const status = message.includes('not configured') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
