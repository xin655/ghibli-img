"use client";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { CONFIG } from '@/app/config/constants';

interface Order {
  id: string;
  type: 'subscription' | 'payment';
  orderId: string;
  plan?: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  interval?: string;
  intervalCount?: number;
  quantity?: number;
  paidAt?: string;
  description?: string;
  paymentMethod?: any;
  billingDetails?: any;
  receiptUrl?: string;
  metadata?: any;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'subscription' | 'payment'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    const type = searchParams.get('type') || 'all';
    setCurrentPage(page);
    setActiveTab(type as any);
    fetchOrders(page, type as any);
  }, [searchParams]);

  const fetchOrders = async (page: number = 1, type: 'all' | 'subscription' | 'payment' = 'all') => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        router.push('/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        type,
      });

      const response = await fetch(`/api/billing/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setPagination(data.pagination);
      } else if (response.status === 401) {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        localStorage.removeItem('userState');
        router.push('/login');
      } else {
        setError('获取订单历史失败');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'all' | 'subscription' | 'payment') => {
    setActiveTab(tab);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams);
    params.set('type', tab);
    params.set('page', '1');
    router.push(`/orders?${params}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/orders?${params}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'succeeded':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
      case 'failed':
      case 'expired':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '活跃';
      case 'succeeded':
        return '成功';
      case 'completed':
        return '完成';
      case 'pending':
        return '待处理';
      case 'processing':
        return '处理中';
      case 'cancelled':
        return '已取消';
      case 'failed':
        return '失败';
      case 'expired':
        return '已过期';
      default:
        return status;
    }
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
              <h1 className="text-xl font-bold text-gray-900">订单历史</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'all', name: '全部订单', icon: '📋' },
                { id: 'subscription', name: '订阅订单', icon: '🔄' },
                { id: 'payment', name: '支付记录', icon: '💳' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
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
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">
                            {order.type === 'subscription' ? '🔄' : '💳'}
                          </span>
                          <h3 className="font-medium text-gray-900">
                            {order.type === 'subscription' ? '订阅订单' : '支付记录'}
                          </h3>
                          <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">订单ID</p>
                            <p className="font-medium text-gray-900">{order.orderId}</p>
                          </div>
                          
                          {order.type === 'subscription' && order.plan && (
                            <div>
                              <p className="text-gray-600">订阅计划</p>
                              <p className="font-medium text-gray-900">
                                {CONFIG.SUBSCRIPTION.PLANS[order.plan.toUpperCase() as keyof typeof CONFIG.SUBSCRIPTION.PLANS]?.name || order.plan}
                              </p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-gray-600">金额</p>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(order.amount, order.currency)}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-gray-600">创建时间</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          
                          {order.type === 'subscription' && order.currentPeriodEnd && (
                            <div>
                              <p className="text-gray-600">到期时间</p>
                              <p className="font-medium text-gray-900">
                                {formatDate(order.currentPeriodEnd)}
                              </p>
                            </div>
                          )}
                          
                          {order.type === 'payment' && order.paidAt && (
                            <div>
                              <p className="text-gray-600">支付时间</p>
                              <p className="font-medium text-gray-900">
                                {formatDate(order.paidAt)}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {order.type === 'subscription' && order.interval && (
                          <div className="mt-2 text-sm text-gray-600">
                            计费周期: 每 {order.intervalCount} {order.interval === 'month' ? '月' : '年'}
                          </div>
                        )}
                        
                        {order.type === 'payment' && order.description && (
                          <div className="mt-2 text-sm text-gray-600">
                            {order.description}
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex flex-col space-y-2">
                        {order.receiptUrl && (
                          <a
                            href={order.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 text-sm"
                          >
                            查看收据
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📋</div>
                <p className="text-gray-500">暂无订单记录</p>
              </div>
            )}

            {/* 分页 */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <nav className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}

