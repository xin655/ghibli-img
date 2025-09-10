"use client";
import { useState, useEffect } from 'react';

interface ProgressIndicatorProps {
  isVisible: boolean;
  progress: number;
  message: string;
  subMessage?: string;
  onComplete?: () => void;
}

export default function ProgressIndicator({ 
  isVisible, 
  progress, 
  message, 
  subMessage,
  onComplete 
}: ProgressIndicatorProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (isVisible) {
      // 平滑更新进度条
      const interval = setInterval(() => {
        setDisplayProgress(prev => {
          const diff = progress - prev;
          if (Math.abs(diff) < 0.1) {
            clearInterval(interval);
            if (progress >= 100 && onComplete) {
              setTimeout(onComplete, 500);
            }
            return progress;
          }
          return prev + diff * 0.1;
        });
      }, 50);

      return () => clearInterval(interval);
    } else {
      setDisplayProgress(0);
    }
  }, [isVisible, progress, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="ghibli-card-gradient rounded-xl p-8 max-w-md w-full mx-4 border border-white/30 shadow-2xl">
        <div className="text-center">
          {/* 动画图标 */}
          <div className="mb-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-[var(--ghibli-primary)]/20"></div>
              <div 
                className="absolute inset-0 rounded-full border-4 border-[var(--ghibli-primary)] border-t-transparent animate-spin"
                style={{
                  transform: `rotate(${displayProgress * 3.6}deg)`,
                  transition: 'transform 0.3s ease-out'
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-[var(--ghibli-primary)] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-3 bg-gradient-to-r from-[var(--ghibli-primary)] to-[var(--ghibli-secondary)] rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${displayProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>0%</span>
              <span className="font-medium">{Math.round(displayProgress)}%</span>
              <span>100%</span>
            </div>
          </div>

          {/* 消息 */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--ghibli-primary)] mb-2">
              {message}
            </h3>
            {subMessage && (
              <p className="text-sm text-[var(--ghibli-secondary)]">
                {subMessage}
              </p>
            )}
          </div>

          {/* 动画点 */}
          <div className="flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-[var(--ghibli-primary)] rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s'
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 进度管理器
export class ProgressManager {
  private static progress: number = 0;
  private static message: string = '';
  private static subMessage: string = '';
  private static isVisible: boolean = false;
  private static listeners: Array<() => void> = [];

  static show(message: string, subMessage?: string) {
    this.isVisible = true;
    this.message = message;
    this.subMessage = subMessage || '';
    this.progress = 0;
    this.notifyListeners();
  }

  static update(progress: number, message?: string, subMessage?: string) {
    this.progress = Math.min(100, Math.max(0, progress));
    if (message) this.message = message;
    if (subMessage) this.subMessage = subMessage;
    this.notifyListeners();
  }

  static hide() {
    this.isVisible = false;
    this.progress = 0;
    this.message = '';
    this.subMessage = '';
    this.notifyListeners();
  }

  static simulateProgress(
    steps: Array<{ message: string; subMessage?: string; duration: number }>,
    onComplete?: () => void
  ) {
    this.show(steps[0].message, steps[0].subMessage);
    
    let currentStep = 0;
    let currentProgress = 0;
    
    const interval = setInterval(() => {
      const step = steps[currentStep];
      const progressPerStep = 100 / steps.length;
      const progressInStep = (currentProgress % 1) * progressPerStep;
      const totalProgress = (currentStep * progressPerStep) + progressInStep;
      
      this.update(totalProgress, step.message, step.subMessage);
      
      currentProgress += 0.02; // 每50ms增加2%
      
      if (currentProgress >= 1) {
        currentStep++;
        currentProgress = 0;
        
        if (currentStep >= steps.length) {
          clearInterval(interval);
          setTimeout(() => {
            this.hide();
            onComplete?.();
          }, 500);
        }
      }
    }, 50);
    
    return () => clearInterval(interval);
  }

  static addListener(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  static getState() {
    return {
      isVisible: this.isVisible,
      progress: this.progress,
      message: this.message,
      subMessage: this.subMessage
    };
  }
}
