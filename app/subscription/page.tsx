"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONFIG } from '../config/constants';
import { useSession } from 'next-auth/react';

export default function SubscriptionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      if (status !== 'authenticated') {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ /* potentially include plan details here if needed */ }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error || '创建订阅失败');
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Subscribe error:', error);
      alert('创建订阅失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f8e7] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-[#2d4c2f]">
          Choose Your Plan
        </h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-[#2d4c2f]">Free Trial</h2>
            <div className="text-3xl font-bold mb-6 text-[#7fc97f]">$0</div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <span className="text-[#7fc97f] mr-2">✓</span>
                {CONFIG.FREE_TRIAL.AUTHENTICATED_USER_LIMIT} free image transformations
              </li>
              <li className="flex items-center">
                <span className="text-[#7fc97f] mr-2">✓</span>
                Basic Ghibli style
              </li>
              <li className="flex items-center">
                <span className="text-[#7fc97f] mr-2">✓</span>
                Standard resolution
              </li>
            </ul>
            <button
              className="w-full py-3 rounded-full bg-[#e6f3d8] text-[#2d4c2f] font-semibold"
              disabled
            >
              Current Plan
            </button>
          </div>

          {/* Premium Plan */}
          <div className="bg-[#e6f3d8] rounded-2xl p-8 shadow-lg border-2 border-[#7fc97f]">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#7fc97f] text-white px-4 py-1 rounded-full text-sm">
              Popular
            </div>
            <h2 className="text-2xl font-bold mb-4 text-[#2d4c2f]">Premium</h2>
            <div className="text-3xl font-bold mb-6 text-[#7fc97f]">$9.99<span className="text-lg">/month</span></div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center">
                <span className="text-[#7fc97f] mr-2">✓</span>
                Unlimited transformations
              </li>
              <li className="flex items-center">
                <span className="text-[#7fc97f] mr-2">✓</span>
                All Ghibli styles
              </li>
              <li className="flex items-center">
                <span className="text-[#7fc97f] mr-2">✓</span>
                High resolution downloads
              </li>
              <li className="flex items-center">
                <span className="text-[#7fc97f] mr-2">✓</span>
                Priority processing
              </li>
              <li className="flex items-center">
                <span className="text-[#7fc97f] mr-2">✓</span>
                Commercial usage rights
              </li>
            </ul>
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="w-full py-3 rounded-full bg-[#7fc97f] text-white font-semibold hover:bg-[#5fa75f] transition disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Subscribe Now'}
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8 text-center text-[#2d4c2f]">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-2 text-[#2d4c2f]">How does billing work?</h3>
              <p className="text-[#4b6b4b]">You'll be charged monthly on the same date you subscribed. You can cancel anytime.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#2d4c2f]">Can I cancel my subscription?</h3>
              <p className="text-[#4b6b4b]">Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#2d4c2f]">What payment methods do you accept?</h3>
              <p className="text-[#4b6b4b]">We accept all major credit cards through our secure payment processor, Stripe.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 