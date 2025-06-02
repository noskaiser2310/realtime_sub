import React, { useEffect, useRef } from 'react';
import type { ThemeType } from '../types';

interface TranscriptAreaProps {
  content: React.ReactNode; 
  isEditing?: boolean;
  onEdit?: (newText: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  theme: ThemeType;
}

export const TranscriptArea: React.FC<TranscriptAreaProps> = ({ 
    content, 
    isEditing = false, 
    onEdit,
    textareaRef,
    theme
}) => {
  const endOfContentRef = useRef<HTMLDivElement | null>(null);
  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const currentTextareaRef = textareaRef || localTextareaRef;

  useEffect(() => {
    if (!isEditing && typeof content === 'string') {
      endOfContentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content, isEditing]);

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

  const bgColor = theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100';
  const textColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-800';
  const editingBgColor = theme === 'dark' ? 'bg-slate-600' : 'bg-white';
  const editingTextColor = theme === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const scrollbarThumb = theme === 'dark' ? 'scrollbar-thumb-slate-500' : 'scrollbar-thumb-slate-400';
  const scrollbarTrack = theme === 'dark' ? 'scrollbar-track-slate-600' : 'scrollbar-track-slate-200';


  return (
    <div className={`h-80 p-4 rounded-lg overflow-y-auto flex flex-col ${bgColor} ${textColor} ${isEditing ? '' : 'justify-center'}`}>
      {isEditing ? (
        <textarea
          ref={currentTextareaRef}
          value={typeof content === 'string' ? content : ''}
          onChange={handleTextChange}
          className={`w-full h-full flex-grow p-2 rounded-md resize-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 scrollbar-thin ${editingBgColor} ${editingTextColor} ${scrollbarThumb} ${scrollbarTrack}`}
          aria-label="Editable transcript area"
        />
      ) : typeof content === 'string' ? (
        <p className="whitespace-pre-wrap self-start w-full">{content}</p>
      ) : (
        <div className="flex items-center justify-center h-full">{content}</div>
      )}
      {!isEditing && <div ref={endOfContentRef} />}
    </div>
  );
};