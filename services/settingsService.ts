import { 
    DEFAULT_APP_SETTINGS, 
    SUPPORTED_LANGUAGES, 
    DEFAULT_SOURCE_LANGUAGE, 
    DEFAULT_TARGET_LANGUAGE 
} from '../constants';
import type { AppSettings, LanguageOption, ThemeType } from '../types';

const SETTINGS_STORAGE_KEY_PREFIX = 'meetingAssistantSettings_';

let currentSettings: AppSettings = { ...DEFAULT_APP_SETTINGS };
let currentUserIdForSettings: string | null = null;

const getSettingsKey = (userId: string | null): string => {
    return `${SETTINGS_STORAGE_KEY_PREFIX}${userId || 'guest'}`;
};

const loadSettings = (userId: string | null): AppSettings => {
    const settingsKey = getSettingsKey(userId);
    const storedSettingsJson = localStorage.getItem(settingsKey);
    if (storedSettingsJson) {
        try {
            const storedSettings = JSON.parse(storedSettingsJson) as AppSettings;
            // Validate loaded settings (e.g., ensure languages are still supported)
            const validSourceLang = SUPPORTED_LANGUAGES.find(l => l.code === storedSettings.sourceLanguage?.code) || DEFAULT_SOURCE_LANGUAGE;
            const validTargetLang = SUPPORTED_LANGUAGES.find(l => l.code === storedSettings.targetLanguage?.code) || DEFAULT_TARGET_LANGUAGE;
            return {
                ...DEFAULT_APP_SETTINGS, // Start with defaults to ensure all keys exist
                ...storedSettings,
                sourceLanguage: validSourceLang,
                targetLanguage: validTargetLang,
            };
        } catch (error) {
            console.error("Error parsing stored settings, reverting to defaults:", error);
            return { ...DEFAULT_APP_SETTINGS };
        }
    }
    return { ...DEFAULT_APP_SETTINGS };
};

const saveSettings = (userId: string | null, settings: AppSettings): void => {
    const settingsKey = getSettingsKey(userId);
    localStorage.setItem(settingsKey, JSON.stringify(settings));
};

export const settingsService = {
    init: async (userId: string | null): Promise<AppSettings> => {
        console.log(`[SettingsService] Initializing for user: ${userId || 'guest'}`);
        currentUserIdForSettings = userId;
        currentSettings = loadSettings(userId);
        // Save settings if it was the first load (to ensure guest settings are stored)
        if (!localStorage.getItem(getSettingsKey(userId))) {
            saveSettings(userId, currentSettings);
        }
        console.log(`[SettingsService] Loaded settings:`, currentSettings);
        return { ...currentSettings };
    },

    getSettings: (): AppSettings => {
        return { ...currentSettings };
    },

    updateSettings: async (updates: Partial<AppSettings>): Promise<AppSettings> => {
        currentSettings = { ...currentSettings, ...updates };
        saveSettings(currentUserIdForSettings, currentSettings);
        console.log(`[SettingsService] Updated settings for user ${currentUserIdForSettings || 'guest'}:`, currentSettings);
        return { ...currentSettings };
    },

    setTheme: async (theme: ThemeType): Promise<AppSettings> => {
        return settingsService.updateSettings({ theme });
    },

    setSourceLanguage: async (language: LanguageOption): Promise<AppSettings> => {
        return settingsService.updateSettings({ sourceLanguage: language });
    },

    setTargetLanguage: async (language: LanguageOption): Promise<AppSettings> => {
        return settingsService.updateSettings({ targetLanguage: language });
    },
};
