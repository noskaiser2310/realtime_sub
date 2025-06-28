
import { SummaryType } from './types';
import type { LanguageOption, SummaryContent, AppSettings, ThemeType, PlanTierId, PlanDetails, PlanFeatureConfig } from './types';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English' }, 
  { code: 'vi', name: 'Vietnamese' }, 
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'de', name: 'German' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese (Simplified)'},
  { code: 'hi', name: 'Hindi'},
  { code: 'ar', name: 'Arabic'}
];

export const LIMITED_LANGUAGE_OPTIONS: LanguageOption[] = [
  SUPPORTED_LANGUAGES.find(l => l.code === 'en')!,
  SUPPORTED_LANGUAGES.find(l => l.code === 'vi')!,
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

export const DEFAULT_THEME: ThemeType = 'light'; 
export const DEFAULT_SOURCE_LANGUAGE: LanguageOption = SUPPORTED_LANGUAGES.find(lang => lang.code === 'vi') || SUPPORTED_LANGUAGES[0];
export const DEFAULT_TARGET_LANGUAGE: LanguageOption = SUPPORTED_LANGUAGES.find(lang => lang.code === 'vi') || SUPPORTED_LANGUAGES[0];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: DEFAULT_THEME,
  sourceLanguage: DEFAULT_SOURCE_LANGUAGE,
  targetLanguage: DEFAULT_TARGET_LANGUAGE,
};

// Subscription Plan Configuration
export const PLAN_CONFIG: Record<PlanTierId, PlanDetails> = {
  guest: {
    id: 'guest',
    name: 'Gói Trải Nghiệm',
    price: 'Miễn phí',
    usageLimitHours: 10,
    features: {
      moreLanguageOptions: false,
      textToSpeech: false,
      pdfReport: false,
      advancedTranslation: false,
    },
    featureListDisplay: ['Ghi âm & Phiên âm cơ bản (EN, VI)', '10 giờ sử dụng/tháng', 'Tóm tắt cơ bản']
  },
  student: {
    id: 'student',
    name: 'Gói Sinh Viên',
    price: '150.000₫/người',
    usageLimitHours: 30,
    features: {
      moreLanguageOptions: false, // Limited languages
      textToSpeech: false,
      pdfReport: true,
      advancedTranslation: false,
    },
    featureListDisplay: ['Phiên âm (EN, VI)', 'Tóm tắt tài liệu đã ghi âm', '30 giờ sử dụng/tháng', 'Tải báo cáo PDF']
  },
  standard: {
    id: 'standard',
    name: 'Gói Tiêu Chuẩn',
    price: '200.000₫/người',
    usageLimitHours: 35,
    features: {
      moreLanguageOptions: true, // All languages
      textToSpeech: false,
      pdfReport: true,
      advancedTranslation: false,
    },
    featureListDisplay: ['Nhiều tuỳ chọn ngôn ngữ hơn', 'Tóm tắt & Dịch thuật cơ bản', '35 giờ sử dụng/tháng', 'Tải báo cáo PDF']
  },
  premium: {
    id: 'premium',
    name: 'Gói Cao Cấp',
    price: '500.000₫/người',
    usageLimitHours: 45,
    features: {
      moreLanguageOptions: true,
      advancedTranslation: true, // "AI thông minh hơn" - placeholder for now
      textToSpeech: true,
      pdfReport: true,
    },
    featureListDisplay: ['Mọi tính năng Gói Tiêu Chuẩn', 'Dịch thuật AI nâng cao', 'Hỗ trợ chuyển văn bản thành giọng nói', '45 giờ sử dụng/tháng']
  },
};

// Default plan for new users
export const DEFAULT_PLAN_ID: PlanTierId = 'guest';

// Original 30-hour limit, now derived from PLAN_CONFIG dynamically
// export const MONTHLY_USAGE_LIMIT_SECONDS = 30 * 60 * 60; // Now dynamically set by plan
export const getUsageLimitSecondsByPlan = (planId: PlanTierId): number => {
    return (PLAN_CONFIG[planId]?.usageLimitHours || PLAN_CONFIG.guest.usageLimitHours) * 60 * 60;
};
export const MONTHLY_USAGE_LIMIT_SECONDS = getUsageLimitSecondsByPlan(DEFAULT_PLAN_ID); // Default for constants, but will be overridden
