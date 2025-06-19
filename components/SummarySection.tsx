
import React from 'react';
import { SummaryType } from '../types';
import type { SummaryContent, ThemeType } from '../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { LightbulbIcon, ListChecksIcon } from './icons/FeatureIcons';

interface SummarySectionProps {
  summary: SummaryContent;
  onSummarize: (type: SummaryType) => void;
  isLoading: boolean; // Simplified: true if this specific summary type is loading
  isProcessing?: boolean; // True if transcript is empty/still processing
  theme: ThemeType;
  summaryTypeToShow: SummaryType; // New prop to specify which summary to show/generate
}

export const SummarySection: React.FC<SummarySectionProps> = ({ 
    summary, 
    onSummarize, 
    isLoading, 
    isProcessing, 
    theme,
    summaryTypeToShow 
}) => {
  
  const typeDetails = summaryTypeToShow === SummaryType.KeyPoints 
    ? { type: SummaryType.KeyPoints, label: 'Điểm Chính', icon: LightbulbIcon }
    : { type: SummaryType.ActionItems, label: 'Mục Hành Động', icon: ListChecksIcon };

  const buttonDisabled = isLoading || isProcessing;

  const cardBgColor = theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'; // Kept for card if used standalone
  const headingColor = theme === 'dark' ? 'text-purple-400' : 'text-purple-600';
  const textColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-800';
  const infoTextColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const buttonTextColor = 'text-white'; // Always white for purple button
  const buttonBgColor = theme === 'dark' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600';

  const currentSummaryText = summary[summaryTypeToShow];

  return (
    <div className="space-y-3 sm:space-y-4 h-full flex flex-col">
      <button
        onClick={() => onSummarize(typeDetails.type)}
        disabled={buttonDisabled}
        className={`w-full flex items-center justify-center font-semibold py-2.5 px-3 sm:px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed ${buttonBgColor} ${buttonTextColor} text-sm sm:text-base`}
        title={isProcessing && !isLoading ? "Cần có nội dung phiên âm để tóm tắt" : `Tạo ${typeDetails.label}`}
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <typeDetails.icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
        )}
        Tạo {typeDetails.label}
      </button>

      <div className={`flex-grow p-3 sm:p-4 rounded-lg shadow-inner min-h-[150px] sm:min-h-[200px] overflow-y-auto scrollbar-thin ${theme === 'dark' ? 'bg-slate-600 scrollbar-thumb-slate-500 scrollbar-track-slate-600' : 'bg-slate-50 scrollbar-thumb-slate-400 scrollbar-track-slate-200'}`}>
        {isLoading ? (
            <div className={`flex items-center justify-center h-full ${infoTextColor}`}>
                <LoadingSpinner size="md" /> 
                <span className="ml-2 text-sm sm:text-base">Đang tạo {typeDetails.label.toLowerCase()}...</span>
            </div>
        ) : currentSummaryText ? (
            <p className={`whitespace-pre-wrap text-sm sm:text-base ${textColor}`}>{currentSummaryText}</p>
        ) : isProcessing ? (
             <p className={`text-xs sm:text-sm text-center italic ${infoTextColor} flex items-center justify-center h-full`}>Khi có nội dung phiên âm, bạn có thể tạo {typeDetails.label.toLowerCase()}.</p>
        ) : (
             <p className={`text-xs sm:text-sm text-center italic ${infoTextColor} flex items-center justify-center h-full`}>Nhấn nút ở trên để tạo {typeDetails.label.toLowerCase()}.</p>
        )}
      </div>
    </div>
  );
};
