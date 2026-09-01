import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  carrierGateway: z.string().optional(),
  eventDate: z.string().optional(),
  pickupOrDelivery: z.string().optional(),
  servings: z.string().optional(),
  flavor: z.string().optional(),
  designNotes: z.string().optional(),
  referenceUrl: z.string().url().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const payload = {
      customer_name: parsed.data.name,
      customer_email: parsed.data.email ?? null,
      customer_phone: parsed.data.phone ?? null,
      carrier_gateway: parsed.data.carrierGateway ?? null,
      event_date: parsed.data.eventDate ?? null,
      pickup_or_delivery: parsed.data.pickupOrDelivery ?? null,
      servings: parsed.data.servings ? parseInt(parsed.data.servings, 10) : null,
      flavor: parsed.data.flavor ?? null,
      design_notes: parsed.data.designNotes ?? null,
      design_reference_url: parsed.data.referenceUrl ?? null
    };

    const { data, error } = await supabase.from('guest_requests').insert([payload]).select().single();

    if (error) {
      console.error('Supabase insert error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Prepare notification
    const momEmail = process.env.MOM_EMAIL;
    const momPhoneGateway = process.env.MOM_PHONE_GATEWAY; // e.g. 8502077511@vztext.com
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '';

    const summary = `New cake request from ${data.customer_name}\nDate: ${data.event_date ?? 'N/A'}\nServings: ${data.servings ?? 'N/A'}\nFlavor: ${data.flavor ?? 'N/A'}\nNotes: ${data.design_notes ?? ''}\nView requests: ${appUrl}/dashboard/requests`;

    // Send email via Resend (if configured)
    if (process.env.RESEND_API_KEY && momEmail && process.env.FROM_EMAIL) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.FROM_EMAIL,
            to: [momEmail],
            subject: `New cake request: ${data.customer_name}`,
            text: summary
          })
        });
      } catch (mailErr) {
        console.warn('Resend email failed', mailErr);
      }
    }

    // Optional: send email-to-SMS via Resend to carrier gateway
    if (process.env.RESEND_API_KEY && momPhoneGateway && process.env.FROM_EMAIL) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.FROM_EMAIL,
            to: [momPhoneGateway],
            subject: '',
            text: `New request from ${data.customer_name} — ${appUrl}/dashboard/requests`
          })
        });
      } catch (smsErr) {
        console.warn('Email-to-SMS failed', smsErr);
      }
    }

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
