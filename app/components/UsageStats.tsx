"use client";
import { useState } from 'react';
import { CONFIG } from '@/app/config/constants';

interface UsageStatsProps {
  remainingCount: number;
  totalCount: number;
  isAuthenticated: boolean;
  onUpgrade: () => void;
  subscriptionPlan?: 'free' | 'basic' | 'pro' | 'enterprise';
  isSubscriptionActive?: boolean;
  totalTransformations?: number;
}

export default function UsageStats({ 
  remainingCount, 
  totalCount, 
  isAuthenticated,
  onUpgrade,
  subscriptionPlan = 'free',
  isSubscriptionActive = false,
  totalTransformations = 0
}: UsageStatsProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // 根据订阅状态计算使用情况
  const isSubscribed = isAuthenticated && isSubscriptionActive && subscriptionPlan !== 'free';
  
  // 计算已使用次数
  let usedCount: number;
  if (isSubscribed) {
    // 对于订阅用户，直接使用 totalTransformations
    usedCount = totalTransformations || 0;
  } else {
    // 对于免费用户，使用 totalCount - remainingCount
    usedCount = totalCount - remainingCount;
  }
  
  // 对于订阅用户，使用订阅计划的限制
  let maxUsage = totalCount;
  if (isSubscribed) {
    const planConfig = CONFIG.SUBSCRIPTION.PLANS[subscriptionPlan.toUpperCase() as keyof typeof CONFIG.SUBSCRIPTION.PLANS];
    maxUsage = planConfig?.conversions || totalCount;
  }
  
  // 计算使用百分比
  const usagePercentage = maxUsage > 0 ? (usedCount / maxUsage) * 100 : 0;
  const isNearLimit = usagePercentage >= CONFIG.FREE_TRIAL.WARNING_THRESHOLD;
  const shouldPrompt = usagePercentage >= CONFIG.FREE_TRIAL.CONVERSION_PROMPT_THRESHOLD;
  
  if (!isAuthenticated) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6 shadow-lg animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">
              免费体验次数: {remainingCount}/{CONFIG.FREE_TRIAL.UNAUTHENTICATED_USER_LIMIT}
            </h3>
            <p className="text-xs text-blue-700 mt-1">
              登录后可获得 {CONFIG.FREE_TRIAL.AUTHENTICATED_USER_LIMIT} 次免费试用
            </p>
          </div>
          <div className="w-16 h-16 relative">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-blue-200"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-600"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${usagePercentage}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-blue-900">
                {usedCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`border rounded-xl p-4 mb-6 shadow-lg animate-fade-in ${
      isSubscribed ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50' :
      isNearLimit ? 'border-red-200 bg-gradient-to-r from-red-50 to-pink-50' : 
      shouldPrompt ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50' : 
      'border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className={`text-sm font-medium ${
            isSubscribed ? 'text-green-900' :
            isNearLimit ? 'text-red-900' : 
            shouldPrompt ? 'text-yellow-900' : 
            'text-gray-900'
          }`}>
            {isSubscribed ? (
              <>
                {subscriptionPlan === 'enterprise' ? '企业套餐 - 无限制使用' : 
                 `剩余使用次数: ${remainingCount === -1 ? '无限制' : remainingCount}`}
              </>
            ) : (
              `剩余免费次数: ${remainingCount}`
            )}
          </h3>
          <p className={`text-xs mt-1 ${
            isSubscribed ? 'text-green-700' :
            isNearLimit ? 'text-red-700' : 
            shouldPrompt ? 'text-yellow-700' : 
            'text-gray-700'
          }`}>
            {isSubscribed ? (
              <>
                已使用 {usedCount} 次
                {maxUsage !== -1 && ` / ${maxUsage} 次`}
                {subscriptionPlan !== 'enterprise' && ` (${Math.round(usagePercentage)}%)`}
              </>
            ) : (
              `已使用 ${usedCount}/${totalCount} 次`
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
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
                className={`${
                  isSubscribed ? 'text-green-500' :
                  isNearLimit ? 'text-red-500' : 
                  shouldPrompt ? 'text-yellow-500' : 
                  'text-indigo-500'
                }`}
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${usagePercentage}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-medium ${
                isSubscribed ? 'text-green-900' :
                isNearLimit ? 'text-red-900' : 
                shouldPrompt ? 'text-yellow-900' : 
                'text-gray-900'
              }`}>
                {subscriptionPlan === 'enterprise' ? '∞' : `${Math.round(usagePercentage)}%`}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg 
              className={`w-4 h-4 transform transition-transform ${showDetails ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">总转换次数:</span>
              <span className="ml-2 font-medium">{usedCount}</span>
            </div>
            <div>
              <span className="text-gray-600">剩余次数:</span>
              <span className="ml-2 font-medium">
                {isSubscribed && remainingCount === -1 ? '无限制' : remainingCount}
              </span>
            </div>
            <div>
              <span className="text-gray-600">使用率:</span>
              <span className="ml-2 font-medium">
                {subscriptionPlan === 'enterprise' ? '无限制' : `${Math.round(usagePercentage)}%`}
              </span>
            </div>
            <div>
              <span className="text-gray-600">状态:</span>
              <span className={`ml-2 font-medium ${
                isSubscribed ? 'text-green-600' :
                isNearLimit ? 'text-red-600' : 
                shouldPrompt ? 'text-yellow-600' : 
                'text-green-600'
              }`}>
                {isSubscribed ? (
                  subscriptionPlan === 'enterprise' ? '企业套餐' : 
                  `${CONFIG.SUBSCRIPTION.PLANS[subscriptionPlan.toUpperCase() as keyof typeof CONFIG.SUBSCRIPTION.PLANS]?.name || '订阅用户'}`
                ) : (
                  isNearLimit ? '即将用完' : 
                  shouldPrompt ? '建议升级' : 
                  '正常使用'
                )}
              </span>
            </div>
          </div>
          
          {shouldPrompt && !isSubscribed && (
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <p className="text-sm text-gray-700 mb-3">
                {isNearLimit ? 
                  '您的免费试用次数即将用完，升级到付费套餐可继续享受服务。' :
                  '考虑升级到付费套餐，获得更多转换次数和高级功能。'
                }
              </p>
          <button
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            查看升级选项
          </button>
            </div>
          )}
          
          {isSubscribed && (
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <p className="text-sm text-gray-700 mb-3">
                {subscriptionPlan === 'enterprise' ? 
                  '您正在使用企业套餐，享受无限制的图片转换服务。' :
                  `您正在使用${CONFIG.SUBSCRIPTION.PLANS[subscriptionPlan.toUpperCase() as keyof typeof CONFIG.SUBSCRIPTION.PLANS]?.name || '订阅套餐'}，每月可转换 ${maxUsage === -1 ? '无限制' : maxUsage} 次图片。`
                }
              </p>
              <button
                onClick={onUpgrade}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                管理订阅
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
