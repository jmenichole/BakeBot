'use client';

import { useState } from 'react';
import { toast } from '@/hooks/useToast';

type CheckoutType = 'monthly' | 'lifetime' | 'order';

interface StripeCheckoutButtonProps {
  checkoutType: CheckoutType;
  orderId?: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function StripeCheckoutButton({
  checkoutType,
  orderId,
  className = '',
  children,
  disabled = false,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: checkoutType, orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not start checkout');
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? 'Redirecting…' : children}
    </button>
  );
}
