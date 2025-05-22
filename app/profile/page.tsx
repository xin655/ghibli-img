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

  // Add state for invoices
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  // Add state for subscription history
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Add state for transformation history
  const [transformations, setTransformations] = useState<any[]>([]);
  const [transformationsLoading, setTransformationsLoading] = useState(false);
  const [transformationsError, setTransformationsError] = useState<string | null>(null);

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalTransformations, setTotalTransformations] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isLoadingTransformations, setIsLoadingTransformations] = useState(false);

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

  // Effect to fetch data after profile is loaded
  useEffect(() => {
    if (!loading && profile) {
      if (profile.stripeCustomerId) {
        console.log('Profile with Stripe Customer ID loaded, attempting to fetch invoices and subscription history...');
        fetchInvoices();
        fetchSubscriptionHistory();
      } else {
        console.log('Profile loaded but no Stripe Customer ID found, skipping invoice and subscription history fetch.');
        setInvoices([]);
        setSubscriptionHistory([]);
      }
      // Fetch transformations always if profile is loaded
      console.log('Profile loaded, attempting to fetch transformations...');
      fetchTransformations();
    } else if (!loading && !profile) {
      console.log('Profile finished loading but no profile data found.');
      setInvoices([]);
      setSubscriptionHistory([]);
      setTransformations([]);
    }
  }, [profile, loading, currentPage]); // Depend on profile and loading state

  const fetchProfile = async () => {
    console.log('Attempting to fetch profile from /api/user/profile');
    setLoading(true); // Ensure loading state is set when fetching starts
    setError(null); // Clear previous errors
    try {
      const response = await fetch('/api/user/profile', { credentials: 'include' });
      console.log('Profile API response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profile');
      }
      const data = await response.json();
      console.log('Profile data received:', data);
      // Add detailed log for subscription data in profile
      console.log('Profile subscription data:', data?.subscription);
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      console.log('Finished profile fetch attempt.');
    }
  };

  const fetchInvoices = async () => {
    console.log('Attempting to fetch invoices from /api/user/invoices');
    setInvoicesLoading(true);
    setInvoicesError(null);
    try {
      const response = await fetch('/api/user/invoices', { credentials: 'include' });
      console.log('Invoices API response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch invoices');
      }
      const data = await response.json();
      console.log('Invoices data received:', data);
      // Add detailed log for the invoices array
      console.log('Fetched invoices array:', data?.invoices);
      setInvoices(data.invoices);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setInvoicesError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setInvoicesLoading(false);
      console.log('Finished invoice fetch attempt.');
    }
  };

  // Function to fetch subscription history
  const fetchSubscriptionHistory = async () => {
    console.log('Attempting to fetch subscription history from /api/user/subscription-history');
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch('/api/user/subscription-history', { credentials: 'include' });
      console.log('Subscription History API response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subscription history');
      }
      const data = await response.json();
      console.log('Subscription history data received:', data);
      setSubscriptionHistory(data.history);
    } catch (err) {
      console.error('Error fetching subscription history:', err);
      setHistoryError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setHistoryLoading(false);
      console.log('Finished subscription history fetch attempt.');
    }
  };

  // Function to fetch transformation history
  const fetchTransformations = async () => {
    try {
      console.log('Attempting to fetch transformation history from /api/user/transformations');
      const response = await fetch(`/api/user/transformations?page=${currentPage}&limit=${itemsPerPage}`);
      console.log('Transformation History API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transformations: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Transformation history data received:', data);
      
      if (data.transformations) {
        setTransformations(data.transformations);
        setTotalTransformations(data.totalTransformations);
        setTotalPages(data.totalPages);
      } else {
        console.error('No transformations data in response');
        setTransformations([]);
      }
    } catch (error) {
      console.error('Error fetching transformations:', error);
      setTransformations([]);
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

  // Add pagination controls
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
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

          {/* Invoice History Section */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Invoice History</h3>
            {invoicesLoading && <p>Loading invoices...</p>}
            {invoicesError && <p className="text-red-600">Error loading invoices: {invoicesError}</p>}
            {!invoicesLoading && !invoicesError && invoices.length === 0 && profile?.isSubscribed && (
              <p className="text-gray-500 text-sm">No invoice history found yet.</p>
            )}
             {!invoicesLoading && !invoicesError && invoices.length === 0 && !profile?.isSubscribed && (
              <p className="text-gray-500 text-sm">Subscribe to view your invoice history.</p>
            )}
            {!invoicesLoading && !invoicesError && invoices.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(invoice.created * 1000).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(invoice.amount_due / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {/* Basic status display, can be enhanced */}
                          {invoice.status === 'paid' && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Paid</span>
                          )}
                          {invoice.status !== 'paid' && (
                               <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">{invoice.status}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {invoice.hosted_invoice_url && (
                             <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">View</a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Subscription History Section */}
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Subscription History</h3>
            {historyLoading && <p>Loading subscription history...</p>}
            {historyError && <p className="text-red-600">Error loading history: {historyError}</p>}
            {!historyLoading && !historyError && subscriptionHistory.length === 0 && profile?.isSubscribed && (
                 <p className="text-gray-500 text-sm">No subscription history found yet.</p>
            )}
            {!historyLoading && !historyError && subscriptionHistory.length === 0 && !profile?.isSubscribed && (
                 <p className="text-gray-500 text-sm">Subscribe to view your subscription history.</p>
            )}
            {!historyLoading && !historyError && subscriptionHistory.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      {/* Add more headers if needed, e.g., Start Date, End Date */}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptionHistory.map((sub) => (
                      <tr key={sub.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {/* Display plan name; adjust based on Stripe Plan object if needed */}
                          {typeof sub.plan === 'object' && sub.plan !== null ? (sub.plan as any).name : sub.plan}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                           {/* Display status with basic styling */}
                           {sub.status === 'active' && (
                               <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                           )}
                           {sub.status === 'canceled' && (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Canceled</span>
                           )}
                           {sub.status !== 'active' && sub.status !== 'canceled' && (
                               <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">{sub.status}</span>
                           )}
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {/* Display subscription period */}
                            {sub.current_period_start && sub.current_period_end ? (
                                `${new Date(sub.current_period_start * 1000).toLocaleDateString()} - ${new Date(sub.current_period_end * 1000).toLocaleDateString()}`
                            ) : 'N/A'}
                        </td>
                        {/* Add more cells for other details */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transformation History Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">转换历史记录</h2>
            {transformations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        原始图片
                      </th>
                      <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        转换后图片
                      </th>
                      <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        转换时间
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transformations.map((transformation) => (
                      <tr key={transformation._id}>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          <div className="flex items-center">
                            <div className="h-20 w-20 relative">
                              {transformation.originalUrl ? (
                                <Image
                                  src={transformation.originalUrl}
                                  alt="Original"
                                  fill
                                  className="object-cover rounded"
                                />
                              ) : (
                                <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-400 text-sm">No Image</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          <div className="flex items-center">
                            <div className="h-20 w-20 relative">
                              {transformation.transformedUrl ? (
                                <Image
                                  src={transformation.transformedUrl}
                                  alt="Transformed"
                                  fill
                                  className="object-cover rounded"
                                />
                              ) : (
                                <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-400 text-sm">No Image</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                          {new Date(transformation.createdAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination Controls */}
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-100"
                  >
                    上一页
                  </button>
                  <span className="text-gray-600">
                    第 {currentPage} 页，共 {totalPages} 页
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-100"
                  >
                    下一页
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">暂无转换记录</p>
            )}
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
                href="/subscription"
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