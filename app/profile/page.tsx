'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface UserProfile {
  name: string;
  email: string;
  image?: string;
  isSubscribed: boolean;
  subscriptionExpiresAt?: number;
  stripeCustomerId?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);

    const fetchProfile = async () => {
      if (session?.user?.email) {
        console.log('Fetching profile for:', session.user.email);
        try {
          const response = await fetch('/api/user/profile');
          console.log('Profile API response status:', response.status);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log('Profile data received:', data);
          setProfile(data);
        } catch (error) {
          console.error('Error fetching profile:', error);
        } finally {
          console.log('Finished profile fetch attempt.');
          setLoading(false);
        }
      } else if (status !== 'loading') {
        // If session is not loading and no email is available, stop loading
        console.log('Session not available or loading finished without user email.');
        setLoading(false);
      }
    };

    // Only attempt to fetch profile if session is loaded and user email is available
    if (status === 'authenticated') {
        fetchProfile();
    } else if (status === 'unauthenticated') {
        // If unauthenticated, set loading to false immediately
        setLoading(false);
    } else if (status === 'loading') {
        // Still loading, do nothing yet
        console.log('Session is still loading...');
    }

  }, [session, status]); // Add status to dependency array

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in to view your profile</h2>
          <Link
            href="/api/auth/signin"
            className="text-blue-600 hover:text-blue-800"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Profile Header */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex items-center">
              {profile?.image && (
                <img
                  src={profile.image}
                  alt={profile.name}
                  className="h-16 w-16 rounded-full"
                />
              )}
              <div className="ml-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {profile?.name || 'User'}
                </h3>
                <p className="text-sm text-gray-500">{profile?.email}</p>
              </div>
            </div>
          </div>

          {/* Subscription Status */}
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Subscription Status</h4>
            <div className="bg-gray-50 rounded-md p-4">
              {profile?.isSubscribed ? (
                <div>
                  <p className="text-green-600 font-medium">Active Subscription</p>
                  {profile.subscriptionExpiresAt && (
                    <p className="text-sm text-gray-500 mt-1">
                      Expires: {new Date(profile.subscriptionExpiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">No active subscription</p>
                  <Link
                    href="/subscription"
                    className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Subscribe Now
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
            <div className="flex justify-between">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800"
              >
                Back to Home
              </Link>
              <Link
                href="/api/auth/signout"
                className="text-red-600 hover:text-red-800"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 