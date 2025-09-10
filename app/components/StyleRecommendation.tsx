"use client";
import { useState, useEffect } from 'react';

interface StyleRecommendationProps {
  imageUrl: string;
  onRecommendation: (recommendedStyle: string) => void;
}

interface StyleRecommendation {
  imageType: 'portrait' | 'landscape' | 'object' | 'nature' | 'architecture';
  recommendedStyles: Array<{
    style: string;
    confidence: number;
    reason: string;
  }>;
  confidence: number;
}

const STYLE_DESCRIPTIONS = {
  ghibli: {
    name: '吉卜力风格',
    description: '温暖的手绘动画风格，适合人物和自然场景',
    icon: '🎨',
    colors: ['#2D5016', '#8B4513', '#FFD700']
  },
  watercolor: {
    name: '水彩风格',
    description: '柔和的色彩过渡，适合风景和静物',
    icon: '🎭',
    colors: ['#87CEEB', '#F0F8FF', '#DDA0DD']
  },
  comic: {
    name: '漫画风格',
    description: '鲜明的线条和对比，适合人物和动作场景',
    icon: '💥',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1']
  },
  anime: {
    name: '动漫风格',
    description: '现代动漫风格，适合各种场景',
    icon: '✨',
    colors: ['#FF9FF3', '#54A0FF', '#5F27CD']
  }
};

export default function StyleRecommendation({ imageUrl, onRecommendation }: StyleRecommendationProps) {
  const [recommendation, setRecommendation] = useState<StyleRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    if (imageUrl) {
      analyzeImage(imageUrl);
    }
  }, [imageUrl]);

  const analyzeImage = async (url: string) => {
    setIsAnalyzing(true);
    
    try {
      // 模拟图片分析（实际项目中可以调用 AI 服务）
      const mockRecommendation = await mockImageAnalysis(url);
      setRecommendation(mockRecommendation);
      setShowRecommendations(true);
    } catch (error) {
      console.error('Image analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mockImageAnalysis = async (url: string): Promise<StyleRecommendation> => {
    // 模拟分析延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 基于图片 URL 或内容进行简单分析
    const imageType = determineImageType(url);
    
    return {
      imageType,
      recommendedStyles: getRecommendedStyles(imageType),
      confidence: 0.85
    };
  };

  const determineImageType = (url: string): StyleRecommendation['imageType'] => {
    // 简单的启发式分析（实际项目中可以使用更复杂的 AI 分析）
    const filename = url.toLowerCase();
    
    if (filename.includes('portrait') || filename.includes('person') || filename.includes('face')) {
      return 'portrait';
    } else if (filename.includes('landscape') || filename.includes('nature') || filename.includes('forest')) {
      return 'nature';
    } else if (filename.includes('building') || filename.includes('architecture') || filename.includes('city')) {
      return 'architecture';
    } else if (filename.includes('object') || filename.includes('item')) {
      return 'object';
    } else {
      return 'landscape';
    }
  };

  const getRecommendedStyles = (imageType: StyleRecommendation['imageType']) => {
    const recommendations = {
      portrait: [
        { style: 'ghibli', confidence: 0.9, reason: '吉卜力风格特别适合人物肖像，能展现温暖的情感' },
        { style: 'anime', confidence: 0.8, reason: '动漫风格能突出人物特征' },
        { style: 'comic', confidence: 0.7, reason: '漫画风格适合个性化表达' }
      ],
      nature: [
        { style: 'ghibli', confidence: 0.95, reason: '吉卜力风格完美展现自然美景' },
        { style: 'watercolor', confidence: 0.85, reason: '水彩风格适合风景画' },
        { style: 'anime', confidence: 0.7, reason: '动漫风格能增强自然场景的梦幻感' }
      ],
      architecture: [
        { style: 'comic', confidence: 0.8, reason: '漫画风格能突出建筑线条' },
        { style: 'anime', confidence: 0.75, reason: '动漫风格适合现代建筑' },
        { style: 'ghibli', confidence: 0.7, reason: '吉卜力风格适合传统建筑' }
      ],
      object: [
        { style: 'watercolor', confidence: 0.85, reason: '水彩风格适合静物画' },
        { style: 'comic', confidence: 0.8, reason: '漫画风格能突出物体特征' },
        { style: 'anime', confidence: 0.7, reason: '动漫风格适合现代物品' }
      ],
      landscape: [
        { style: 'ghibli', confidence: 0.9, reason: '吉卜力风格完美展现风景' },
        { style: 'watercolor', confidence: 0.8, reason: '水彩风格适合风景画' },
        { style: 'anime', confidence: 0.7, reason: '动漫风格能增强场景氛围' }
      ]
    };

    return recommendations[imageType] || recommendations.landscape;
  };

  const handleStyleSelect = (style: string) => {
    onRecommendation(style);
    setShowRecommendations(false);
  };

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="mb-6">
      {isAnalyzing && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-lg animate-fade-in">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <div>
              <h3 className="text-sm font-medium text-blue-900">正在分析图片...</h3>
              <p className="text-xs text-blue-700">AI 正在为您推荐最适合的风格</p>
            </div>
          </div>
        </div>
      )}

      {recommendation && showRecommendations && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-green-900 flex items-center">
                <span className="mr-2">🎯</span>
                AI 风格推荐
              </h3>
              <p className="text-xs text-green-700">
                基于图片内容分析，为您推荐最适合的风格
              </p>
            </div>
            <button
              onClick={() => setShowRecommendations(false)}
              className="text-green-400 hover:text-green-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            {recommendation.recommendedStyles.map((rec, index) => {
              const styleInfo = STYLE_DESCRIPTIONS[rec.style as keyof typeof STYLE_DESCRIPTIONS];
              return (
                <div
                  key={rec.style}
                  className={`p-3 rounded-lg border transition-all duration-300 transform hover:scale-[1.02] cursor-pointer ${
                    index === 0 
                      ? 'border-green-300 bg-green-100 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                  }`}
                  onClick={() => handleStyleSelect(rec.style)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{styleInfo.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">{styleInfo.name}</h4>
                        <p className="text-xs text-gray-600">{rec.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center">
                        <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                          <div 
                            className="h-2 bg-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${rec.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {Math.round(rec.confidence * 100)}%
                        </span>
                      </div>
                      {index === 0 && (
                        <span className="text-xs text-green-600 font-medium">推荐</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-center">
            <button
              onClick={() => setShowRecommendations(false)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              手动选择风格
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
