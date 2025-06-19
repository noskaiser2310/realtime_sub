
import React, { useEffect, useRef } from 'react';
import type { ThemeType } from '../types';

interface TranscriptAreaProps {
  title?: string; // New prop for card title
  content: React.ReactNode; 
  isEditing?: boolean;
  onEdit?: (newText: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  theme: ThemeType;
  containerRef?: React.RefObject<HTMLDivElement>; // For useSmartScroll
  headerActions?: React.ReactNode; // New prop for buttons in header (e.g., Edit, TTS controls)
}

export const TranscriptArea: React.FC<TranscriptAreaProps> = ({ 
    title,
    content, 
    isEditing = false, 
    onEdit,
    textareaRef,
    theme,
    containerRef,
    headerActions
}) => {
  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const currentTextareaRef = textareaRef || localTextareaRef;

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onEdit) {
      onEdit(event.target.value);
    }
  };
  
  useEffect(() => {
    if (isEditing && currentTextareaRef.current) {
      currentTextareaRef.current.style.height = 'auto';
      currentTextareaRef.current.style.height = `${currentTextareaRef.current.scrollHeight}px`;
    }
  }, [content, isEditing, currentTextareaRef]);

  const cardBgColor = theme === 'dark' ? 'bg-slate-800' : 'bg-white';
  const contentBgColor = theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100';
  const textColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-800';
  const editingBgColor = theme === 'dark' ? 'bg-slate-600' : 'bg-white';
  const editingTextColor = theme === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const scrollbarThumb = theme === 'dark' ? 'scrollbar-thumb-slate-500' : 'scrollbar-thumb-slate-400';
  const scrollbarTrack = theme === 'dark' ? 'scrollbar-track-slate-600' : 'scrollbar-track-slate-200';
  const titleColor = theme === 'dark' ? 'text-sky-300' : 'text-sky-700';


  return (
    <div className={`flex flex-col p-3 sm:p-4 rounded-xl shadow-xl ${cardBgColor} h-full`}>
      {title && (
        <div className="flex justify-between items-center mb-2 sm:mb-3">
          <h2 className={`text-base sm:text-lg font-semibold ${titleColor}`}>
            {title}
          </h2>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div 
        ref={containerRef}
        // Max height ensures it doesn't grow indefinitely, especially in flex column
        className={`flex-grow h-64 md:h-72 lg:h-80 p-3 sm:p-4 rounded-lg overflow-y-auto ${contentBgColor} ${textColor} ${isEditing ? '' : 'flex flex-col'}`}
      >
        {isEditing ? (
          <textarea
            ref={currentTextareaRef}
            value={typeof content === 'string' ? content : ''}
            onChange={handleTextChange}
            className={`w-full h-full flex-grow p-2 rounded-md resize-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 scrollbar-thin ${editingBgColor} ${editingTextColor} ${scrollbarThumb} ${scrollbarTrack}`}
            aria-label="Editable transcript area"
          />
        ) : typeof content === 'string' ? (
          <p className="whitespace-pre-wrap self-start w-full text-sm sm:text-base">{content}</p>
        ) : (
          <div className="flex items-center justify-center h-full text-sm sm:text-base">{content}</div>
        )}
      </div>
    </div>
  );
};
