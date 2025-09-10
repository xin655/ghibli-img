"use client";
import { useState, useEffect } from 'react';

interface UserGuideProps {
  step: 'upload' | 'style' | 'transform' | 'download';
  isFirstTime: boolean;
  onComplete?: () => void;
}

interface GuideStep {
  id: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  target: string;
  action?: string;
}

const GUIDE_STEPS: Record<string, GuideStep> = {
  upload: {
    id: 'upload',
    title: '上传图片',
    description: '点击这里上传您想要转换的图片，支持 JPG、PNG、GIF 格式',
    position: 'bottom',
    target: '[data-guide="upload-area"]',
    action: '点击上传区域'
  },
  style: {
    id: 'style',
    title: '选择风格',
    description: '选择您喜欢的艺术风格，每种风格都有独特的视觉效果',
    position: 'bottom',
    target: '[data-guide="style-selection"]',
    action: '选择风格'
  },
  transform: {
    id: 'transform',
    title: '开始转换',
    description: '点击按钮开始 AI 转换，通常需要几秒钟时间',
    position: 'top',
    target: '[data-guide="transform-button"]',
    action: '点击转换'
  },
  download: {
    id: 'download',
    title: '下载结果',
    description: '转换完成后，您可以下载高质量的转换结果',
    position: 'top',
    target: '[data-guide="download-button"]',
    action: '点击下载'
  }
};

export default function UserGuide({ step, isFirstTime, onComplete }: UserGuideProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<GuideStep | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isFirstTime && step) {
      const guideStep = GUIDE_STEPS[step];
      if (guideStep) {
        setCurrentStep(guideStep);
        setIsVisible(true);
        
        // 延迟显示，确保目标元素已渲染
        setTimeout(() => {
          updateOverlayPosition(guideStep);
        }, 100);
      }
    }
  }, [step, isFirstTime]);

  const updateOverlayPosition = (guideStep: GuideStep) => {
    const targetElement = document.querySelector(guideStep.target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      let top = rect.top + scrollTop;
      let left = rect.left + scrollLeft;
      let width = rect.width;
      let height = rect.height;

      // 根据位置调整覆盖层
      switch (guideStep.position) {
        case 'top':
          top = rect.top + scrollTop - 10;
          height = rect.height + 20;
          break;
        case 'bottom':
          top = rect.top + scrollTop - 10;
          height = rect.height + 20;
          break;
        case 'left':
          left = rect.left + scrollLeft - 10;
          width = rect.width + 20;
          break;
        case 'right':
          left = rect.left + scrollLeft - 10;
          width = rect.width + 20;
          break;
      }

      setOverlayStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 1000,
        pointerEvents: 'none'
      });
    }
  };

  const handleNext = () => {
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    setIsVisible(false);
    // 标记用户已跳过引导
    localStorage.setItem('userGuideSkipped', 'true');
    onComplete?.();
  };

  if (!isVisible || !currentStep) {
    return null;
  }

  return (
    <>
      {/* 覆盖层 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in"
        style={{ pointerEvents: 'auto' }}
      >
        {/* 高亮区域 */}
        <div
          className="bg-white rounded-lg shadow-2xl border-4 border-[var(--ghibli-accent)] animate-pulse-glow"
          style={overlayStyle}
        />
      </div>

      {/* 引导提示 */}
      <div className="fixed z-50 animate-fade-in" style={{
        top: currentStep.position === 'bottom' ? 
          `${(overlayStyle.top as number) + (overlayStyle.height as number) + 20}px` :
          `${(overlayStyle.top as number) - 200}px`,
        left: `${(overlayStyle.left as number) + (overlayStyle.width as number) / 2 - 150}px`,
        width: '300px'
      }}>
        <div className="ghibli-card-gradient rounded-xl p-6 border border-white/30 shadow-2xl">
          <div className="flex items-start">
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-[var(--ghibli-accent)] rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">
                    {Object.keys(GUIDE_STEPS).indexOf(currentStep.id) + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[var(--ghibli-primary)]">
                  {currentStep.title}
                </h3>
              </div>
              
              <p className="text-[var(--ghibli-secondary)] mb-4 text-sm leading-relaxed">
                {currentStep.description}
              </p>
              
              {currentStep.action && (
                <div className="mb-4 p-3 bg-[var(--ghibli-cloud)]/50 rounded-lg border border-[var(--ghibli-primary)]/20">
                  <p className="text-sm text-[var(--ghibli-primary)] font-medium">
                    💡 {currentStep.action}
                  </p>
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={handleNext}
                  className="flex-1 ghibli-button-gradient text-white px-4 py-2 rounded-md text-sm font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  知道了
                </button>
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  跳过引导
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// 引导管理器
export class GuideManager {
  private static currentStep: string | null = null;
  private static isFirstTime: boolean = false;

  static initialize() {
    // 检查是否是首次访问
    const hasVisited = localStorage.getItem('hasVisited');
    const guideSkipped = localStorage.getItem('userGuideSkipped');
    
    this.isFirstTime = !hasVisited && !guideSkipped;
    
    if (this.isFirstTime) {
      localStorage.setItem('hasVisited', 'true');
    }
  }

  static startGuide(step: string) {
    if (this.isFirstTime) {
      this.currentStep = step;
      // 触发引导显示
      window.dispatchEvent(new CustomEvent('showGuide', { detail: { step } }));
    }
  }

  static completeGuide() {
    this.currentStep = null;
    localStorage.setItem('userGuideCompleted', 'true');
  }

  static isGuideActive(): boolean {
    return this.currentStep !== null;
  }

  static getCurrentStep(): string | null {
    return this.currentStep;
  }
}
