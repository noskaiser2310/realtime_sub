import { SummaryType } from './types';
import type { LanguageOption, SummaryContent, AppSettings, ThemeType } from './types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English' }, // English (US) for STT, 'en' for Translate
  { code: 'vi', name: 'Vietnamese' }, // Vietnamese for STT, 'vi' for Translate
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  // Add more STT-compatible codes if needed, e.g. en-GB, es-ES
  // For translation, just the two-letter code is usually sufficient for Gemini.
];

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';

export const INITIAL_SUMMARY_CONTENT: SummaryContent = {
  [SummaryType.KeyPoints]: '',
  [SummaryType.ActionItems]: '',
};

export const SUMMARY_PROMPT_TEMPLATES = {
  [SummaryType.KeyPoints]: (text: string, languageName: string) => 
    `Extract the key discussion points from the following meeting transcript. The transcript is in ${languageName}. Present them as a concise bulleted list. Transcript:\n\n"${text}"`,
  [SummaryType.ActionItems]: (text: string, languageName: string) => 
    `Identify any action items or next steps mentioned in the following meeting transcript. The transcript is in ${languageName}. List them clearly. If no action items are found, state that. Transcript:\n\n"${text}"`,
};

export const DEFAULT_THEME: ThemeType = 'light'; // Changed from 'dark' to 'light'
export const DEFAULT_SOURCE_LANGUAGE: LanguageOption = SUPPORTED_LANGUAGES.find(lang => lang.code === 'vi') || SUPPORTED_LANGUAGES[0];
export const DEFAULT_TARGET_LANGUAGE: LanguageOption = SUPPORTED_LANGUAGES.find(lang => lang.code === 'vi') || SUPPORTED_LANGUAGES[0];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: DEFAULT_THEME,
  sourceLanguage: DEFAULT_SOURCE_LANGUAGE,
  targetLanguage: DEFAULT_TARGET_LANGUAGE,
};