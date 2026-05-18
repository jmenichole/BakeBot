'use client';

import Link from 'next/link';
import { Lock, Sparkles, Rocket } from 'lucide-react';

export default function TrialExpiredPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FFF9F9]">
      <div className="max-w-2xl w-full bg-white p-12 rounded-[3rem] shadow-xl text-center border border-pink-50">
        <div className="w-20 h-20 bg-pink-100 text-primary rounded-3xl flex items-center justify-center mx-auto mb-8 transform rotate-12">
          <Lock className="w-10 h-10" />
        </div>
        
        <h1 className="text-4xl font-serif font-black mb-4">Beta Trial Completed!</h1>
        <p className="text-xl text-gray-600 mb-10 leading-relaxed">
          Thank you for being part of our early beta! Your 14-day testing period has ended. 
          We&apos;re currently polishing the final version of <strong>Bake Ops</strong> based on your feedback.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-10 text-left">
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" /> Premium Plan
            </h3>
            <p className="text-sm text-gray-500 mb-4">Get unlimited AI mockups, automated planning, and Stripe payments.</p>
            <div className="text-2xl font-black text-secondary">$49<span className="text-sm font-normal text-gray-400">/mo</span></div>
          </div>
          <div className="bg-secondary text-white p-6 rounded-2xl">
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <Rocket className="w-4 h-4 text-pink-400" /> Coming Soon
            </h3>
            <p className="text-sm text-gray-300 mb-4">We&apos;ll notify you as soon as the full platform launches globally.</p>
            <span className="text-xs font-bold uppercase tracking-widest text-pink-400">Join Priority List</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/api/auth/grant-access?plan=monthly" className="btn btn-primary py-4 px-10 text-lg text-center">
            Upgrade with Stripe
          </a>
          <Link href="/pricing" className="btn btn-secondary py-4 px-10 text-lg text-center">View Plans</Link>
        </div>
        
        <p className="mt-8 text-sm text-gray-400">
          Have more feedback? <a href="mailto:beta@bakeops.app" className="text-primary hover:underline">beta@bakeops.app</a>
        </p>
      </div>
    </div>
  );
}
