import React from 'react';
import type { LanguageOption, ThemeType } from '../types';

interface LanguageSelectorProps {
  label: string;
  selectedLanguage: LanguageOption;
  languages: LanguageOption[];
  onChange: (language: LanguageOption) => void;
  isDisabled?: boolean;
  theme?: ThemeType; // Optional theme prop
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  label,
  selectedLanguage,
  languages,
  onChange,
  isDisabled = false,
  theme = 'dark', // Default to dark if not provided
}) => {
  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLangCode = event.target.value;
    const lang = languages.find(l => l.code === selectedLangCode);
    if (lang) {
      onChange(lang);
    }
  };

  const labelColor = theme === 'dark' ? 'text-slate-300' : 'text-slate-700';
  const selectBgColor = theme === 'dark' ? 'bg-slate-700' : 'bg-white';
  const selectBorderColor = theme === 'dark' ? 'border-slate-600' : 'border-slate-300';
  const selectTextColor = theme === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const selectFocusRing = theme === 'dark' ? 'focus:ring-sky-500 focus:border-sky-500' : 'focus:ring-sky-500 focus:border-sky-500';


  return (
    <div className="flex flex-col space-y-1">
      <label htmlFor={label.replace(/\s+/g, '-').toLowerCase()} className={`text-sm font-medium ${labelColor}`}>
        {label}
      </label>
      <select
        id={label.replace(/\s+/g, '-').toLowerCase()}
        value={selectedLanguage.code}
        onChange={handleSelectChange}
        disabled={isDisabled}
        className={`w-full p-3 border rounded-lg shadow-sm disabled:opacity-70 disabled:cursor-not-allowed ${selectBgColor} ${selectBorderColor} ${selectTextColor} ${selectFocusRing}`}
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code} className={theme === 'dark' ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-900'}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};