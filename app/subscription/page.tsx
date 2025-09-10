"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CONFIG } from '@/app/config/constants';

interface SubscriptionData {
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'enterprise';
    isActive: boolean;
    currentPeriodEnd?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  usage: {
    totalTransformations: number;
    freeTrialsRemaining: number;
    remainingUsage: number;
    maxUsage: number;
    usagePercentage: number;
  };
  history: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalAmount: number;
    lastPaymentDate?: string;
  };
  recentLogs: any[];
  paymentHistory: any[];
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'payments'>('overview');

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/billing/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      } else if (response.status === 401) {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        localStorage.removeItem('userState');
        router.push('/login');
      } else {
        setError('获取订阅信息失败');
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) return;

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        setError('打开订阅管理失败');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      setError('网络错误，请稍后重试');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFE5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFFFE5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="min-h-screen bg-[#FFFFE5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">未找到订阅信息</p>
        </div>
      </div>
    );
  }

  const { subscription, usage, history, recentLogs, paymentHistory } = subscriptionData;
  const isSubscribed = subscription.isActive && subscription.plan !== 'free';
  const planConfig = CONFIG.SUBSCRIPTION.PLANS[subscription.plan.toUpperCase() as keyof typeof CONFIG.SUBSCRIPTION.PLANS];

  return (
    <div className="min-h-screen bg-[#FFFFE5]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回首页
              </button>
            </div>
            <div className="flex items-center">
              <Image
                src="/images/icons/use1.png"
                alt="Ghibli Dreamer"
                width={32}
                height={32}
                className="mr-3"
              />
              <h1 className="text-xl font-bold text-gray-900">订阅管理</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 订阅状态概览 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">订阅概览</h2>
            {isSubscribed && (
              <button
                onClick={handleManageSubscription}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                管理订阅
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 当前计划 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">当前计划</h3>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  isSubscribed ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {planConfig?.name || '免费计划'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {isSubscribed ? '活跃' : '未订阅'}
                  </p>
                </div>
              </div>
            </div>

            {/* 使用情况 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">本月使用</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{usage.totalTransformations}</p>
                  <p className="text-sm text-gray-600">
                    {usage.maxUsage === -1 ? '无限制' : `共 ${usage.maxUsage} 次`}
                  </p>
                </div>
                <div className="w-12 h-12 relative">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-indigo-500"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${usage.usagePercentage}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-900">
                      {usage.maxUsage === -1 ? '∞' : `${Math.round(usage.usagePercentage)}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 到期时间 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                {isSubscribed ? '下次续费' : '状态'}
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {isSubscribed ? formatDate(subscription.currentPeriodEnd) : '免费用户'}
              </p>
              <p className="text-sm text-gray-600">
                {isSubscribed ? '自动续费' : '随时升级'}
              </p>
            </div>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', name: '概览', icon: '📊' },
                { id: 'history', name: '订阅历史', icon: '📋' },
                { id: 'payments', name: '支付记录', icon: '💳' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 计划详情 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">计划详情</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{planConfig?.name || '免费计划'}</h4>
                        <p className="text-sm text-gray-600">
                          {planConfig?.conversions === -1 ? '无限制转换' : `${planConfig?.conversions || 0} 次转换/月`}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-indigo-600">
                        {planConfig?.price ? `$${planConfig.price}` : '免费'}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {planConfig?.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 使用统计 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">使用统计</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{usage.totalTransformations}</p>
                      <p className="text-sm text-blue-600">总转换次数</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {usage.freeTrialsRemaining === -1 ? '∞' : usage.freeTrialsRemaining}
                      </p>
                      <p className="text-sm text-green-600">剩余次数</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-600">{history.totalSubscriptions}</p>
                      <p className="text-sm text-yellow-600">订阅次数</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(history.totalAmount)}
                      </p>
                      <p className="text-sm text-purple-600">总消费</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">订阅历史</h3>
                {recentLogs.length > 0 ? (
                  <div className="space-y-4">
                    {recentLogs.map((log, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {log.action === 'created' ? '订阅创建' :
                               log.action === 'updated' ? '订阅更新' :
                               log.action === 'cancelled' ? '订阅取消' : log.action}
                            </p>
                            <p className="text-sm text-gray-600">
                              {log.toPlan && CONFIG.SUBSCRIPTION.PLANS[log.toPlan.toUpperCase() as keyof typeof CONFIG.SUBSCRIPTION.PLANS]?.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              {formatDate(log.createdAt)}
                            </p>
                            <p className={`text-sm font-medium ${
                              log.status === 'success' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {log.status === 'success' ? '成功' : '失败'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">暂无订阅历史</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">支付记录</h3>
                {paymentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {paymentHistory.map((payment, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(payment.amount)} {payment.currency?.toUpperCase()}
                            </p>
                            <p className="text-sm text-gray-600">
                              支付方式: {payment.paymentMethod?.type || '未知'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              {formatDate(payment.createdAt)}
                            </p>
                            <p className={`text-sm font-medium ${
                              payment.status === 'succeeded' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {payment.status === 'succeeded' ? '成功' : '失败'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">暂无支付记录</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

