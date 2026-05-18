import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing – Bake Ops | AI-Powered Cake Design Platform',
  description: 'Simple, transparent pricing for professional bakers. Start with a 14-day free beta trial. No credit card required.',
  openGraph: {
    title: 'Pricing – Bake Ops',
    description: 'Simple, transparent pricing for professional bakers. Start with a 14-day free beta trial.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Pricing – Bake Ops',
    description: 'Simple, transparent pricing for professional bakers. Start with a 14-day free beta trial.',
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            Simple, Transparent <span className="text-primary">Pricing</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join the Bake Ops beta and lock in exclusive founder pricing.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Trial Plan */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold mb-2">Beta Tester</h3>
            <div className="mb-6">
              <span className="text-4xl font-extrabold">$0</span>
              <span className="text-gray-500 ml-2">for 14 days</span>
            </div>
            <p className="text-gray-600 mb-8">
              Experience the full power of Bake Ops while helping us shape the future of baking management.
            </p>
            <ul className="space-y-4 mb-8 flex-grow text-sm">
              {[
                'AI Cake Configurator',
                'Production Planning',
                'Order Management',
                'Daily Analytics Reports'
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-gray-700">
                  <Check className="w-4 h-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center py-4 px-6 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Monthly Plan */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-bl-[4rem] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <h3 className="text-xl font-bold mb-2">Monthly Pro</h3>
            <div className="mb-6">
              <span className="text-4xl font-extrabold">$29</span>
              <span className="text-gray-500 ml-2">/month</span>
            </div>
            <p className="text-gray-600 mb-8">
              Full access to all professional features with the flexibility of a monthly subscription.
            </p>
            <ul className="space-y-4 mb-8 flex-grow text-sm">
              {[
                'Everything in Beta Trial',
                'Unlimited AI Generations',
                'Advanced Production Tools',
                'Client CRM & History',
                'Remove BakeBot Branding'
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-gray-700">
                  <Check className="w-4 h-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href="/api/auth/grant-access?plan=monthly"
              className="block text-center py-4 px-6 rounded-xl border-2 border-primary text-primary font-bold hover:bg-pink-50 transition-colors"
            >
              Subscribe Now
            </a>
          </div>

          {/* Lifetime Plan */}
          <div className="bg-white p-8 rounded-3xl border-2 border-primary shadow-xl relative flex flex-col">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg whitespace-nowrap">
              <Sparkles className="w-4 h-4" />
              FOUNDER LIFETIME DEAL
            </div>
            <h3 className="text-xl font-bold mb-2">Lifetime Founder</h3>
            <div className="mb-6">
              <span className="text-4xl font-extrabold">$149</span>
              <span className="text-gray-500 ml-2">one-time</span>
            </div>
            <p className="text-gray-600 mb-8">
              Pay once, own it forever. Exclusive to our first 100 beta testers. Locked-in value.
            </p>
            <ul className="space-y-4 mb-8 flex-grow text-sm">
              {[
                'Everything in Monthly Pro',
                'Lifetime Updates',
                'Priority Feature Requests',
                'Founder Badge on Profile',
                'Direct Founder Support'
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-gray-700">
                  <Check className="w-4 h-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href="/api/auth/grant-access?plan=lifetime"
              className="block text-center py-4 px-6 rounded-xl bg-primary text-white font-bold hover:bg-pink-600 transition-colors shadow-lg shadow-pink-200"
            >
              Get Lifetime Access
            </a>
          </div>
        </div>

        <div className="mt-20 text-center text-gray-500">
          <p>Questions? Reach out at <a href="mailto:jmenichole007@outlook.com" className="text-primary hover:underline">jmenichole007@outlook.com</a></p>
        </div>
      </div>
    </div>
  );
}
