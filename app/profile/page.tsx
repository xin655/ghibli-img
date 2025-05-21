'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export interface UserProfile {
  name?: string;
  email?: string;
  image?: string;
  isSubscribed?: boolean;
  subscriptionExpiresAt?: number;
  stripeCustomerId?: string;
  createdAt?: number;
  lastLoginAt?: number;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('ProfilePage mounted. Session status:', status);
  console.log('ProfilePage mounted. Session data:', session);

  useEffect(() => {
    console.log('ProfilePage useEffect triggered. Session status:', status);
    console.log('ProfilePage useEffect triggered. Session data:', session);
    // Only proceed when session status is not 'loading'
    if (status !== 'loading') {
      if (status === 'unauthenticated') {
        console.log('Session unauthenticated, redirecting to /');
        router.push('/');
      } else if (status === 'authenticated') {
        console.log('Session authenticated, checking user email...');
        // Ensure session and user email are available before fetching profile
        if (session?.user?.email) {
          console.log('User email found:', session.user.email, '. Fetching profile...');
          fetchProfile();
        } else {
          // If authenticated status but no session/email, something is wrong or still initializing
          console.log('Authenticated status but session or email missing.');
          setLoading(false); // Stop loading to avoid infinite spinner
          setError('Authentication successful but user data is missing.');
        }
      }
    } else {
        console.log('Session status is loading...');
    }
  }, [status, session, router]); // Add session to dependency array

  const fetchProfile = async () => {
    console.log('Attempting to fetch profile from /api/user/profile');
    setLoading(true); // Ensure loading state is set when fetching starts
    setError(null); // Clear previous errors
    try {
      const response = await fetch('/api/user/profile');
      console.log('Profile API response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      console.log('Profile data received:', data);
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      console.log('Finished profile fetch attempt.');
    }
  };

  const handleManageSubscription = () => {
    console.log('Attempting to manage subscription.');
    // Redirect to Stripe Customer Portal
    if (profile?.stripeCustomerId) {
        console.log('Redirecting to Stripe Customer Portal...');
        window.location.href = '/api/stripe/create-portal-session';
    } else {
        console.log('Stripe Customer ID not available for managing subscription.');
        setError('Stripe Customer ID is not available.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-32 w-32 rounded-full bg-gray-200 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mt-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mt-2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center text-red-600">
              <p>Error: {error}</p>
              <button
                onClick={fetchProfile}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <p>No profile data available or still loading.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <div className="relative h-32 w-32 mx-auto">
              <Image
                src={profile.image || '/default-avatar.png'}
                alt={profile.name || 'User'}
                fill
                className="rounded-full object-cover"
              />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">{profile.name}</h2>
            <p className="text-gray-600">{profile.email}</p>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-8">
            <dl className="divide-y divide-gray-200">
              <div className="py-4 flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Subscription Status</dt>
                <dd className="text-sm text-gray-900">
                  {profile.isSubscribed ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </dd>
              </div>

              {profile.isSubscribed && profile.subscriptionExpiresAt && (
                <div className="py-4 flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Subscription Expires</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(profile.subscriptionExpiresAt * 1000).toLocaleDateString()}
                  </dd>
                </div>
              )}

              <div className="py-4 flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                <dd className="text-sm text-gray-900">
                  {profile.createdAt
                    ? new Date(profile.createdAt * 1000).toLocaleDateString()
                    : 'N/A'}
                </dd>
              </div>

              <div className="py-4 flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                <dd className="text-sm text-gray-900">
                  {profile.lastLoginAt
                    ? new Date(profile.lastLoginAt * 1000).toLocaleDateString() +
                      ' ' +
                      new Date(profile.lastLoginAt * 1000).toLocaleTimeString()
                    : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex justify-center space-x-4">
            {profile.isSubscribed ? (
              <button
                onClick={handleManageSubscription}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Manage Subscription
              </button>
            ) : (
              <Link
                href="/payment"
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Subscribe Now
              </Link>
            )}
            <Link
              href="/"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 