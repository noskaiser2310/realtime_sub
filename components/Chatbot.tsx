
import React, { useState, useRef, useEffect } from 'react';
import { LoadingSpinner } from '../LoadingSpinner';
import { SendIcon, ChatBubbleIcon } from './icons/FeatureIcons'; // Added ChatBubbleIcon
import type { ThemeType } from '../types';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

interface ChatbotProps {
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isChatbotLoading: boolean;
  theme: ThemeType;
  // Prop mới để nhận ref từ custom hook useSmartScroll
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const Chatbot: React.FC<ChatbotProps> = ({ 
    chatMessages, 
    onSendMessage, 
    isChatbotLoading, 
    theme, 
    containerRef 
}) => {
  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(event.target.value);
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    if (!userInput.trim() || isChatbotLoading || isSendingMessage) return;
    
    setIsSendingMessage(true);
    const messageToSend = userInput.trim();
    setUserInput(''); 
    await onSendMessage(messageToSend);
    setIsSendingMessage(false);
    inputRef.current?.focus(); 
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  let placeholderText = "Nhập câu hỏi của bạn tại đây...";
  if (isChatbotLoading && chatMessages.length === 0 && !isSendingMessage) {
      placeholderText = "Đang chờ nội dung phiên âm để bắt đầu...";
  } else if (isSendingMessage) {
      placeholderText = "Đang gửi và chờ phản hồi...";
  } else if (isChatbotLoading && !isSendingMessage) {
      placeholderText = "Đang chờ phản hồi từ bot...";
  }

  const mainBgColor = theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100';
  const inputBgColor = theme === 'dark' ? 'bg-slate-600' : 'bg-white';
  const inputBorderColor = theme === 'dark' ? 'border-slate-500' : 'border-slate-300';
  const inputTextColor = theme === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const placeholderColor = theme === 'dark' ? 'placeholder-slate-400' : 'placeholder-slate-500';
  const infoTextColor = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const botMessageBg = theme === 'dark' ? 'bg-slate-600' : 'bg-slate-200';
  const botMessageText = theme === 'dark' ? 'text-slate-100' : 'text-slate-800';
  const scrollbarThumb = theme === 'dark' ? 'scrollbar-thumb-slate-500' : 'scrollbar-thumb-slate-400';
  const scrollbarTrack = theme === 'dark' ? 'scrollbar-track-slate-700' : 'scrollbar-track-slate-200';

  return (
    <div className={`flex flex-col h-[clamp(300px,60vh,500px)] rounded-lg shadow-md ${mainBgColor}`}>
      <div 
        ref={containerRef}
        className={`flex-grow p-4 overflow-y-auto space-y-3 scrollbar-thin ${scrollbarThumb} ${scrollbarTrack}`}
      >
        {chatMessages.length === 0 && isChatbotLoading && !isSendingMessage && (
            <div className={`flex flex-col items-center justify-center h-full ${infoTextColor} p-4`}>
                <ChatBubbleIcon className="w-16 h-16 mb-3 sm:mb-4 opacity-50" />
                <p className="text-center text-sm sm:text-base">
                    Hỏi & Đáp sẽ hoạt động khi có nội dung phiên âm.
                </p>
                <p className="text-center text-xs sm:text-sm mt-1 opacity-80">
                    Bắt đầu ghi âm hoặc tải một phiên đã lưu.
                </p>
            </div>
        )}
        {chatMessages.length === 0 && !isChatbotLoading && !isSendingMessage && (
          <p className={`text-center italic ${infoTextColor} text-sm sm:text-base`}>Khi có nội dung phiên âm, bạn có thể hỏi về cuộc họp tại đây, kể cả khi đang ghi âm.</p>
        )}

        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-xl whitespace-pre-wrap shadow text-sm sm:text-base ${
                msg.sender === 'user'
                  ? 'bg-sky-600 text-white'
                  : `${botMessageBg} ${botMessageText}`
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        
        {isSendingMessage && chatMessages.length > 0 && chatMessages[chatMessages.length -1].sender === 'user' && (
           <div className="flex justify-start">
             <div className={`max-w-[80%] p-3 rounded-xl shadow ${botMessageBg}`}>
                <LoadingSpinner size="sm" color={theme === 'dark' ? "text-slate-300" : "text-slate-600"}/>
             </div>
           </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className={`p-3 border-t rounded-b-lg flex items-start space-x-2 ${mainBgColor} ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
        <textarea
          ref={inputRef}
          value={userInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholderText}
          className={`flex-grow p-2.5 border rounded-lg focus:ring-2 focus:ring-lime-500 focus:border-lime-500 resize-none scrollbar-thin ${inputBgColor} ${inputBorderColor} ${inputTextColor} ${placeholderColor} ${scrollbarThumb} ${scrollbarTrack} text-sm sm:text-base`}
          rows={2}
          disabled={isChatbotLoading || isSendingMessage}
          aria-label="Chat input"
        />
        <button
          type="submit"
          disabled={!userInput.trim() || isChatbotLoading || isSendingMessage}
          className="bg-lime-500 hover:bg-lime-600 text-white font-semibold p-2.5 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed h-[52px] flex items-center justify-center aspect-square"
          aria-label="Gửi tin nhắn chat"
        >
          {isSendingMessage ? <LoadingSpinner size="sm" color="text-white"/> : <SendIcon className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
};
