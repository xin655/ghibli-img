"use client";
import { useState, useEffect } from 'react';
import { CONFIG } from '@/app/config/constants';

interface ConversionPromptProps {
  remainingCount: number;
  totalCount: number;
  onUpgrade: () => void;
  onDismiss: () => void;
  isAuthenticated: boolean;
  subscriptionPlan?: string;
  isSubscriptionActive?: boolean;
  totalTransformations?: number;
}

export default function ConversionPrompt({ 
  remainingCount, 
  totalCount, 
  onUpgrade, 
  onDismiss,
  isAuthenticated,
  subscriptionPlan = 'free',
  isSubscriptionActive = false,
  totalTransformations = 0
}: ConversionPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  // 计算使用情况数据
  const isSubscribed = isSubscriptionActive && subscriptionPlan !== 'free';
  let usedCount: number;
  let maxUsage: number;
  
  if (isSubscribed) {
    // 对于订阅用户，使用 totalTransformations
    usedCount = totalTransformations || 0;
    const planConfig = CONFIG.SUBSCRIPTION.PLANS[subscriptionPlan.toUpperCase() as keyof typeof CONFIG.SUBSCRIPTION.PLANS];
    maxUsage = planConfig?.conversions || totalCount;
  } else {
    // 对于免费用户，使用 totalCount - remainingCount
    usedCount = totalCount - remainingCount;
    maxUsage = totalCount;
  }
  
  const usagePercentage = maxUsage > 0 ? (usedCount / maxUsage) * 100 : 0;
  const isNearLimit = usagePercentage >= CONFIG.FREE_TRIAL.WARNING_THRESHOLD;

  useEffect(() => {
    if (isAuthenticated) {
      // 检查是否应该显示提示（订阅用户不显示转化提示）
      const shouldShow = !isSubscribed && 
                        usagePercentage >= CONFIG.FREE_TRIAL.CONVERSION_PROMPT_THRESHOLD && 
                        !dismissed && 
                        remainingCount > 0;
      
      setIsVisible(shouldShow);
    }
  }, [remainingCount, totalCount, isAuthenticated, dismissed, subscriptionPlan, isSubscriptionActive, totalTransformations, isSubscribed, usagePercentage]);
  
  if (!isVisible) return null;
  
  const handleDismiss = () => {
    setIsVisible(false);
    setDismissed(true);
    onDismiss();
  };
  
  return (
    <div className={`fixed bottom-4 right-4 max-w-sm bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border-l-4 ${
      isNearLimit ? 'border-red-500' : 'border-yellow-500'
    } p-4 z-50 animate-slide-up`}>
      <div className="flex items-start">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              isNearLimit ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isNearLimit ? '⚠️ 试用次数即将用完' : '💡 升级获得更多功能'}
            </h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            您已使用 {usedCount}/{maxUsage} 次转换
            {isNearLimit ? '，仅剩 ' + remainingCount + ' 次' : ''}
          </p>
          
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isNearLimit ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>{totalCount}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {isNearLimit ? '立即升级' : '查看套餐'}
            </button>
            <button
              onClick={handleDismiss}
              className="w-full text-gray-500 hover:text-gray-700 text-sm py-1 transition-colors"
            >
              {isNearLimit ? '稍后提醒' : '暂时关闭'}
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

