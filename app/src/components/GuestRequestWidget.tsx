'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

type FormValues = {
  name: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  pickupOrDelivery?: string;
  servings?: string;
  flavor?: string;
  designNotes?: string;
  referenceUrl?: string;
};

export default function GuestRequestWidget() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>();
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (values: FormValues) => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/guest-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      if (!res.ok) {
        const body = await res.json();
        setErrorMsg(body?.error ? JSON.stringify(body.error) : 'Submission failed');
        return;
      }
      setSubmitted(true);
    } catch (e) {
      setErrorMsg('Network error');
    }
  };

  if (submitted) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">Thank you — request sent!</h2>
        <p className="text-sm">Your request was sent to the baker. She will review and contact you about next steps.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Order a Cake</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="block text-sm font-medium">Your name *</label>
          <input {...register('name', { required: true })} className="mt-1 block w-full rounded-md border p-2" />
          {errors.name && <span className="text-red-600 text-sm">Name is required</span>}
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input {...register('email')} type="email" className="mt-1 block w-full rounded-md border p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Phone</label>
          <input {...register('phone')} className="mt-1 block w-full rounded-md border p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Event date / pickup</label>
          <input {...register('eventDate')} type="date" className="mt-1 block w-full rounded-md border p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Servings (approx.)</label>
          <input {...register('servings')} type="number" min="1" className="mt-1 block w-full rounded-md border p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Flavor / Notes</label>
          <input {...register('flavor')} className="mt-1 block w-full rounded-md border p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Design notes / reference URL</label>
          <input {...register('referenceUrl')} className="mt-1 block w-full rounded-md border p-2" />
        </div>

        <div>
          <label className="block text-sm font-medium">Additional details</label>
          <textarea {...register('designNotes')} className="mt-1 block w-full rounded-md border p-2" rows={3} />
        </div>

        {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}

        <div>
          <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded-md">
            {isSubmitting ? 'Sending...' : 'Send request'}
          </button>
        </div>
      </form>

      <div className="mt-4 text-xs text-gray-600">
        <p>No payment required to submit a request — the baker will review and contact you.</p>
      </div>
    </div>
  );
}
