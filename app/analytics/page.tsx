'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

interface AnalyticsData {
  overview: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalPayments: number;
    totalRevenue: number;
    averageRevenue: number;
  };
  planDistribution: {
    basic: { count: number; revenue: number; active: number };
    pro: { count: number; revenue: number; active: number };
    enterprise: { count: number; revenue: number; active: number };
  };
  monthlyStats: Array<{
    month: string;
    subscriptions: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    action: string;
    fromPlan: string;
    toPlan: string;
    status: string;
    createdAt: string;
    amount: number;
  }>;
  usageAnalysis: {
    totalUsage: number;
    usageBreakdown: {
      basic: number;
      pro: number;
      enterprise: number;
    };
    hasUnlimited: boolean;
    efficiency: number;
  };
  subscriptionTrends: {
    growth: number;
    churn: number;
    upgrades: number;
    downgrades: number;
  };
  rawData: {
    subscriptions: Array<{
      id: string;
      plan: string;
      status: string;
      amount: number;
      currency: string;
      createdAt: string;
      currentPeriodEnd: string;
    }>;
    payments: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
      description: string;
    }>;
  };
}

const COLORS = {
  basic: '#3b82f6',
  pro: '#8b5cf6',
  enterprise: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444'
};

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('jwt');
      if (!token) {
        setError('未找到认证令牌，请先登录');
        setIsAdmin(false);
        return;
      }

      const response = await fetch('/api/billing/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 403) {
        setError('访问被拒绝：需要管理员权限才能查看数据分析');
        setIsAdmin(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '获取分析数据失败');
      }

      const result = await response.json();
      setAnalyticsData(result.data);
      setIsAdmin(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">加载分析数据中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              {isAdmin === false ? '需要管理员权限' : '加载失败'}
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            
            {isAdmin === false ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  📋 数据分析页面仅限管理员访问。如需访问权限，请联系系统管理员。
                </p>
              </div>
            ) : (
              <button 
                onClick={fetchAnalyticsData}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                重试
              </button>
            )}
            
            <div className="mt-6">
              <a 
                href="/" 
                className="text-blue-500 hover:text-blue-600 underline"
              >
                ← 返回首页
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">没有找到分析数据</div>
      </div>
    );
  }

  // 准备图表数据
  const planChartData = [
    { name: 'Basic', value: analyticsData.planDistribution.basic.active, color: COLORS.basic },
    { name: 'Pro', value: analyticsData.planDistribution.pro.active, color: COLORS.pro },
    { name: 'Enterprise', value: analyticsData.planDistribution.enterprise.active, color: COLORS.enterprise }
  ];

  const revenueChartData = [
    { name: 'Basic', revenue: analyticsData.planDistribution.basic.revenue / 100 },
    { name: 'Pro', revenue: analyticsData.planDistribution.pro.revenue / 100 },
    { name: 'Enterprise', revenue: analyticsData.planDistribution.enterprise.revenue / 100 }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">订阅数据分析</h1>
          <p className="text-gray-600 mt-2">深入了解您的订阅使用情况和趋势</p>
        </div>
        <button 
          onClick={fetchAnalyticsData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          刷新数据
        </button>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总订阅数</CardTitle>
            <div className="h-4 w-4 text-blue-600">📊</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              活跃: {analyticsData.overview.activeSubscriptions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收入</CardTitle>
            <div className="h-4 w-4 text-green-600">💰</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.overview.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              平均: ${analyticsData.overview.averageRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总使用量</CardTitle>
            <div className="h-4 w-4 text-purple-600">⚡</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.usageAnalysis.hasUnlimited ? '无限制' : analyticsData.usageAnalysis.totalUsage.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              效率: {analyticsData.usageAnalysis.efficiency.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">增长率</CardTitle>
            <div className="h-4 w-4 text-orange-600">📈</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.subscriptionTrends.growth.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              活跃订阅率
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="plans">计划分布</TabsTrigger>
          <TabsTrigger value="revenue">收入分析</TabsTrigger>
          <TabsTrigger value="usage">使用量分析</TabsTrigger>
          <TabsTrigger value="activity">活动记录</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>月度订阅趋势</CardTitle>
                <CardDescription>订阅数量和收入变化</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="subscriptions" stackId="1" stroke={COLORS.basic} fill={COLORS.basic} />
                    <Area type="monotone" dataKey="revenue" stackId="2" stroke={COLORS.pro} fill={COLORS.pro} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>计划分布</CardTitle>
                <CardDescription>活跃订阅的计划类型分布</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={planChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(analyticsData.planDistribution).map(([plan, stats]) => (
              <Card key={plan}>
                <CardHeader>
                  <CardTitle className="capitalize flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[plan as keyof typeof COLORS] }}
                    />
                    {plan} 计划
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>总订阅数:</span>
                    <Badge variant="outline">{stats.count}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>活跃订阅:</span>
                    <Badge variant="secondary">{stats.active}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>总收入:</span>
                    <span className="font-semibold">${(stats.revenue / 100).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>收入分析</CardTitle>
              <CardDescription>各计划类型的收入分布</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, '收入']} />
                  <Bar dataKey="revenue" fill={COLORS.pro} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>使用量分析</CardTitle>
                <CardDescription>各计划的使用量分布</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Basic 使用量:</span>
                    <Badge variant="outline">{analyticsData.usageAnalysis.usageBreakdown.basic.toLocaleString()} 次</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pro 使用量:</span>
                    <Badge variant="outline">{analyticsData.usageAnalysis.usageBreakdown.pro.toLocaleString()} 次</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Enterprise 使用量:</span>
                    <Badge variant="outline">
                      {analyticsData.usageAnalysis.usageBreakdown.enterprise === -1 ? '无限制' : analyticsData.usageAnalysis.usageBreakdown.enterprise.toLocaleString() + ' 次'}
                    </Badge>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">总使用量:</span>
                      <Badge variant="default">
                        {analyticsData.usageAnalysis.hasUnlimited ? '无限制' : analyticsData.usageAnalysis.totalUsage.toLocaleString() + ' 次'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>使用效率</CardTitle>
                <CardDescription>订阅使用效率分析</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>使用效率:</span>
                    <span className="font-semibold">{analyticsData.usageAnalysis.efficiency.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, analyticsData.usageAnalysis.efficiency)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {analyticsData.usageAnalysis.hasUnlimited 
                      ? '您拥有无限制使用权限' 
                      : '基于当前订阅计算的使用效率'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>最近活动</CardTitle>
              <CardDescription>订阅变更和活动记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div>
                        <div className="font-medium">
                          {activity.action === 'created' && '创建订阅'}
                          {activity.action === 'updated' && '更新订阅'}
                          {activity.action === 'cancelled' && '取消订阅'}
                          {activity.action === 'renewed' && '续费订阅'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {activity.fromPlan && activity.toPlan 
                            ? `${activity.fromPlan} → ${activity.toPlan}`
                            : activity.toPlan || activity.fromPlan || '未知计划'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${activity.amount.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
