import React from 'react';
import { SummaryType } from '../types';
import type { SummaryContent, ThemeType } from '../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { LightbulbIcon, ListChecksIcon } from './icons/FeatureIcons';

interface SummarySectionProps {
  summary: SummaryContent;
  onSummarize: (type: SummaryType) => void;
  isLoading: SummaryType | null;
  isProcessing?: boolean;
  theme: ThemeType;
}

const summaryTypeToDisplay: { type: SummaryType; label: string; icon: React.ElementType }[] = [
  { type: SummaryType.KeyPoints, label: 'Key Points', icon: LightbulbIcon },
  { type: SummaryType.ActionItems, label: 'Action Items', icon: ListChecksIcon },
];

export const SummarySection: React.FC<SummarySectionProps> = ({ summary, onSummarize, isLoading, isProcessing, theme }) => {
  const noSummaryContent = Object.values(summary).every(s => !s.trim());
  const buttonsDisabled = isLoading !== null || isProcessing;

  const cardBgColor = theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100';
  const headingColor = theme === 'dark' ? 'text-purple-300' : 'text-purple-700';
  const textColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-800';
  const infoTextColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {summaryTypeToDisplay.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => onSummarize(type)}
            disabled={buttonsDisabled || isLoading === type}
            className="flex items-center justify-center bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
            title={isProcessing && !isLoading ? "Cần có nội dung phiên âm để tóm tắt" : `Tạo ${label}`}
          >
            {isLoading === type ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Icon className="w-5 h-5 mr-2" />
            )}
            Tạo {label}
          </button>
        ))}
      </div>

      {summaryTypeToDisplay.map(({ type, label }) => (
        (summary[type] || isLoading === type) && ( 
          <div key={`display-${type}`} className={`p-4 rounded-lg shadow ${cardBgColor}`}>
            <h3 className={`text-xl font-semibold mb-2 ${headingColor}`}>{label}</h3>
            {isLoading === type ? (
                <div className={`flex items-center ${infoTextColor}`}>
                    <LoadingSpinner size="sm" /> 
                    <span className="ml-2">Đang tạo {label.toLowerCase()}...</span>
                </div>
            ) : (
                summary[type] ? <p className={`whitespace-pre-wrap ${textColor}`}>{summary[type]}</p> : null
            )}
          </div>
        )
      ))}
       {isProcessing && !isLoading && noSummaryContent && (
         <p className={`text-sm text-center italic ${infoTextColor}`}>Khi có nội dung phiên âm, bạn có thể tạo tóm tắt, kể cả khi đang ghi âm.</p>
       )}
       {!isProcessing && !isLoading && noSummaryContent && (
         <p className={`text-sm text-center italic ${infoTextColor}`}>Nhấn nút ở trên để tạo tóm tắt sau khi có nội dung phiên âm.</p>
       )}
    </div>
  );
};