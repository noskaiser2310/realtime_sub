
import React from 'react';
import type { ThemeType } from '../types';

interface MicrophoneVolumeIndicatorProps {
  volumeLevel: number;
  isActive: boolean;
  isMuted?: boolean; // Added prop
  clarityHint?: 'low' | 'normal';
  theme: ThemeType;
}

const LOW_VOLUME_HINT_MESSAGE = "💡 Mẹo: Hãy thử nói to hơn hoặc đưa micro lại gần.";
const MUTED_MESSAGE = "Micro đã tắt tiếng";

export const MicrophoneVolumeIndicator: React.FC<MicrophoneVolumeIndicatorProps> = ({ 
  volumeLevel, 
  isActive, 
  isMuted = false, 
  clarityHint, 
  theme 
}) => {
  const getBarColor = (level: number): string => {
    if (isMuted) return theme === 'dark' ? 'bg-slate-500' : 'bg-slate-400'; // Muted bar color
    if (level > 75) return 'bg-red-500';
    if (level > 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const normalizedVolume = isMuted ? 0 : Math.max(0, Math.min(100, volumeLevel));

  const containerBgColor = theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100';
  const labelColor = theme === 'dark' ? 'text-slate-300' : 'text-slate-700';
  const volumeTextColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const barBgColor = theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300';
  const idleTextColor = theme === 'dark' ? 'text-slate-500' : 'text-slate-400';
  const mutedTextColor = theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600';


  return (
    <div className={`w-full p-2 rounded-lg shadow ${containerBgColor}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${labelColor}`}>Mức âm lượng Micro:</span>
        {isActive && (
          <span className={`text-xs ${isMuted ? mutedTextColor : volumeTextColor}`}>
            {isMuted ? MUTED_MESSAGE : `${normalizedVolume.toFixed(0)}%`}
          </span>
        )}
      </div>
      <div className={`h-3 w-full rounded-full overflow-hidden ${barBgColor}`}>
        {isActive ? (
          <div
            className={`h-full rounded-full transition-all duration-100 ease-linear ${getBarColor(normalizedVolume)}`}
            style={{ width: isMuted ? '100%' : `${normalizedVolume}%` }} // Full grey bar if muted
            role="progressbar"
            aria-valuenow={normalizedVolume}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Microphone input level ${isMuted ? '(Muted)' : ''}`}
          ></div>
        ) : (
           <div className="h-full flex items-center justify-center">
             <span className={`text-xs italic ${idleTextColor}`}>Chỉ báo âm lượng sẽ hoạt động khi ghi âm...</span>
           </div>
        )}
      </div>
      {isActive && !isMuted && clarityHint === 'low' && (
        <p className="text-xs text-yellow-400 mt-1.5 text-center">{LOW_VOLUME_HINT_MESSAGE}</p>
      )}
    </div>
  );
};
