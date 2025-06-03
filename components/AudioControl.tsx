
import React from 'react';
import { RecordingState } from '../types';
import type { LanguageOption, ThemeType } from '../types';
import { PlayIcon, StopIcon, RecordingStatusIcon } from './icons/MediaIcons';
import { MicIcon, MicOffIcon } from './icons/FeatureIcons'; // Added MicIcon, MicOffIcon
import { LanguageSelector } from './LanguageSelector';
import { LoadingSpinner } from '../LoadingSpinner';
import { MicrophoneVolumeIndicator } from './MicrophoneVolumeIndicator';

interface AudioControlProps {
  recordingState: RecordingState;
  elapsedTime: number;
  sourceLanguage: LanguageOption;
  targetLanguage: LanguageOption;
  supportedLanguages: LanguageOption[];
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSourceLangChange: (lang: LanguageOption) => void;
  onTargetLangChange: (lang: LanguageOption) => void;
  isLoading: boolean; 
  isSttSupported: boolean; 
  micVolumeLevel: number;
  micError: boolean;
  micInputClarityHint?: 'low' | 'normal';
  isSessionLoaded?: boolean;
  theme: ThemeType;
  isMicMuted: boolean; // New prop
  onToggleMicMute: () => void; // New prop
  canToggleMute: boolean; // New prop
}

export const AudioControl: React.FC<AudioControlProps> = ({
  recordingState,
  elapsedTime,
  sourceLanguage,
  targetLanguage,
  supportedLanguages,
  onStartRecording,
  onStopRecording,
  onSourceLangChange,
  onTargetLangChange,
  isLoading, 
  isSttSupported, 
  micVolumeLevel,
  micError,
  micInputClarityHint,
  isSessionLoaded = false,
  theme,
  isMicMuted,
  onToggleMicMute,
  canToggleMute,
}) => {
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const isRecordingActive = recordingState === RecordingState.Recording;
  // Allow starting recording even if a session is loaded.
  // The onStartRecording handler in MainPage will clear the loaded session.
  const canStartRecording = !isRecordingActive && !isLoading && recordingState !== RecordingState.Error;
  const langSelectorsDisabled = isRecordingActive || isLoading; // Session loaded no longer disables language selectors immediately, MainPage handles this based on recording state.

  const timeColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-700';
  const statusTextColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const muteButtonBg = theme === 'dark' ? (isMicMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 hover:bg-slate-500') : (isMicMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-300 hover:bg-slate-400');
  const muteButtonText = theme === 'dark' ? 'text-white' : (isMicMuted ? 'text-white' : 'text-slate-700');

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="flex items-center space-x-4"> {/* Adjusted space for mute button */}
        {isRecordingActive ? (
          <button
            onClick={onStopRecording}
            className="flex items-center justify-center w-24 h-24 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50"
            aria-label="Stop recording"
          >
            <StopIcon className="w-10 h-10" />
          </button>
        ) : (
          <button
            onClick={onStartRecording}
            disabled={!canStartRecording} 
            className="flex items-center justify-center w-24 h-24 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Start recording"
            title={isLoading ? "Đang chuẩn bị..." : isSessionLoaded ? "Xóa phiên đã tải để ghi âm mới" : "Bắt đầu ghi âm"}
          >
            {isLoading ? <LoadingSpinner size="lg" /> : <PlayIcon className="w-10 h-10" />}
          </button>
        )}
        
        <div className="text-center min-w-[100px]">
          <div className={`text-4xl font-mono tracking-wider ${timeColor}`}>{formatTime(elapsedTime)}</div>
          {isRecordingActive && (
            <div className="flex items-center justify-center mt-1 text-red-400">
              <RecordingStatusIcon className="w-5 h-5 animate-pulse mr-1" />
              <span>Đang ghi</span>
            </div>
          )}
           {recordingState === RecordingState.Stopped && !isSessionLoaded && <div className={`mt-1 ${statusTextColor}`}>Đã dừng ghi</div>}
           {isSessionLoaded && <div className={`mt-1 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>Đang xem lại phiên</div>}
           {recordingState === RecordingState.Error && <div className="mt-1 text-red-500">Lỗi ghi âm</div>}
           {recordingState === RecordingState.Idle && !isSessionLoaded && <div className={`mt-1 ${statusTextColor}`}>Sẵn sàng ghi</div>}
        </div>

        <button
          onClick={onToggleMicMute}
          disabled={!canToggleMute}
          className={`flex items-center justify-center w-12 h-12 rounded-full shadow-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 ${muteButtonBg} ${muteButtonText} ${theme === 'dark' ? 'focus:ring-slate-400' : 'focus:ring-slate-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isMicMuted ? "Bật tiếng micro" : "Tắt tiếng micro"}
          title={isMicMuted ? "Bật tiếng micro" : "Tắt tiếng micro"}
        >
          {isMicMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
        </button>
      </div>
      
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <LanguageSelector
          label="Ngôn ngữ gốc (Phiên âm)"
          selectedLanguage={sourceLanguage}
          languages={supportedLanguages}
          onChange={onSourceLangChange}
          isDisabled={langSelectorsDisabled}
          theme={theme}
        />
        <LanguageSelector
          label="Ngôn ngữ đích (Dịch thuật)"
          selectedLanguage={targetLanguage}
          languages={supportedLanguages}
          onChange={onTargetLangChange}
          isDisabled={langSelectorsDisabled}
          theme={theme}
        />
      </div>
      {!micError && (
        <div className="w-full pt-2">
           <MicrophoneVolumeIndicator 
              volumeLevel={micVolumeLevel} 
              isActive={isRecordingActive}
              isMuted={isMicMuted} 
              clarityHint={micInputClarityHint}
              theme={theme}
            />
        </div>
      )}
      {micError && (
         <div className="w-full pt-2 text-xs text-yellow-500 text-center">
            Lỗi hiển thị mức âm lượng mic. Ghi âm có thể bị ảnh hưởng.
        </div>
      )}
       {isSessionLoaded && (
         <p className={`text-xs text-center mt-2 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>Để ghi âm phiên mới, vui lòng nhấn "Bắt đầu ghi âm" (thao tác này sẽ xóa dữ liệu đang xem và tạo phiên mới).</p>
       )}
    </div>
  );
};