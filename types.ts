export enum RecordingState {
  Idle = 'idle',
  Initializing = 'initializing', // New: Streams are being acquired
  Recording = 'recording',
  Stopping = 'stopping', // New: Stop command issued, processing final segment
  Stopped = 'stopped', // Recording finished, cleanup done
  Error = 'error',
}

export interface LanguageOption {
  code: string; // e.g., 'en-US' for STT, 'en' for Translate
  name: string; // e.g., 'English (US)'
}

export enum SummaryType {
  KeyPoints = 'KeyPoints',
  ActionItems = 'ActionItems',
}

export interface SummaryContent {
  [SummaryType.KeyPoints]: string;
  [SummaryType.ActionItems]: string;
}

export interface MediaRecorderOptionsPolyfill {
    mimeType?: string;
    audioBitsPerSecond?: number;
    videoBitsPerSecond?: number;
    bitsPerSecond?: number;
    audioBitrateMode?: "constant" | "variable";
}

// SpeechSynthesisVoice interface is no longer needed in types.ts
// as ttsService.ts handles voice objects internally.
// App.tsx primarily relies on ttsService.isLanguageSupported(langCode).

// New types for routing and app structure
export type RouteType = 'login' | 'register' | 'main' | 'settings';

export type AppStatusType = 'initializing' | 'auth_required' | 'app_ready';

export interface UserDataState {
  name: string;
  id: string | null;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Settings types
export type ThemeType = 'light' | 'dark';

export interface AppSettings {
  theme: ThemeType;
  sourceLanguage: LanguageOption;
  targetLanguage: LanguageOption;
  // Add other settings as needed
}