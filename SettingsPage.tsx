import React from 'react';
import type { AppSettings, LanguageOption, ThemeType } from './types';
import { SUPPORTED_LANGUAGES } from './constants';
import { LanguageSelector } from './components/LanguageSelector'; // Assuming this can be reused
import { SaveIcon, CogIcon } from './components/icons/FeatureIcons';


interface SettingsPageProps {
  currentSettings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  navigateTo: (route: 'main') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentSettings,
  onUpdateSettings,
  showToast,
  navigateTo,
}) => {
  const [theme, setTheme] = React.useState<ThemeType>(currentSettings.theme);
  const [sourceLanguage, setSourceLanguage] = React.useState<LanguageOption>(currentSettings.sourceLanguage);
  const [targetLanguage, setTargetLanguage] = React.useState<LanguageOption>(currentSettings.targetLanguage);
  const [isLoading, setIsLoading] = React.useState(false);

  // Update local state if currentSettings prop changes (e.g., initial load)
  React.useEffect(() => {
    setTheme(currentSettings.theme);
    setSourceLanguage(currentSettings.sourceLanguage);
    setTargetLanguage(currentSettings.targetLanguage);
  }, [currentSettings]);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await onUpdateSettings({
        theme,
        sourceLanguage,
        targetLanguage,
      });
      showToast('Cài đặt đã được lưu!', 'success');
      navigateTo('main');
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast('Lưu cài đặt thất bại.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const pageThemeClass = theme === 'dark' ? 'from-slate-900 to-slate-800 text-slate-100' : 'from-sky-100 to-sky-300 text-slate-800';
  const cardThemeClass = theme === 'dark' ? 'bg-slate-800' : 'bg-white';
  const labelThemeClass = theme === 'dark' ? 'text-slate-300' : 'text-slate-700';
  const selectThemeClass = theme === 'dark' 
    ? 'bg-slate-700 border-slate-600 text-slate-100 focus:ring-sky-500 focus:border-sky-500'
    : 'bg-white border-slate-300 text-slate-900 focus:ring-sky-500 focus:border-sky-500';
  const headingThemeClass = theme === 'dark' ? 'text-sky-400' : 'text-sky-600';


  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${pageThemeClass}`}>
      <div className={`w-full max-w-2xl p-8 space-y-8 rounded-xl shadow-2xl ${cardThemeClass}`}>
        <div className="text-center">
          <h1 className={`text-3xl font-bold ${headingThemeClass} flex items-center justify-center`}>
            <CogIcon className="w-8 h-8 mr-3" />
            Cài đặt ứng dụng
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Tùy chỉnh giao diện và ngôn ngữ mặc định của bạn.
          </p>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <label htmlFor="theme-select" className={`block text-sm font-medium mb-1 ${labelThemeClass}`}>
              Giao diện (Theme)
            </label>
            <select
              id="theme-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeType)}
              className={`w-full p-3 rounded-lg shadow-sm ${selectThemeClass}`}
            >
              <option value="dark">Tối (Dark)</option>
              <option value="light">Sáng (Light)</option>
            </select>
          </div>

          {/* Default Source Language */}
          <LanguageSelector
            label="Ngôn ngữ gốc mặc định (Phiên âm)"
            selectedLanguage={sourceLanguage}
            languages={SUPPORTED_LANGUAGES}
            onChange={setSourceLanguage}
            theme={theme} // Pass theme to LanguageSelector if it needs it
          />

          {/* Default Target Language */}
          <LanguageSelector
            label="Ngôn ngữ đích mặc định (Dịch thuật)"
            selectedLanguage={targetLanguage}
            languages={SUPPORTED_LANGUAGES}
            onChange={setTargetLanguage}
            theme={theme} // Pass theme to LanguageSelector if it needs it
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="w-full flex-1 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" color="text-white" />
                <span className="ml-2">Đang lưu...</span>
              </>
            ) : (
              <>
                <SaveIcon className="w-5 h-5 mr-2" />
                Lưu thay đổi
              </>
            )}
          </button>
          <button
            onClick={() => navigateTo('main')}
            className={`w-full flex-1 flex items-center justify-center font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out ${
              theme === 'dark' 
                ? 'bg-slate-600 hover:bg-slate-500 text-slate-100' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            Hủy bỏ
          </button>
        </div>
      </div>
      <footer className="mt-8 text-center text-slate-500 text-xs">
        &copy; {new Date().getFullYear()} Real-time Meeting Assistant.
      </footer>
    </div>
  );
};

// Placeholder LoadingSpinner for local use if not imported globally
const LoadingSpinner: React.FC<{size?: 'sm' | 'md'; color?: string}> = ({size = 'md', color = 'text-sky-400'}) => {
    const sizeClasses = { sm: 'w-5 h-5 border-2', md: 'w-8 h-8 border-4' };
    return <div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-transparent ${color} border-solid`} role="status"><span className="sr-only">Loading...</span></div>;
};

