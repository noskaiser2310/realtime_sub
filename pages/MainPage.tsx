import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AudioControl } from '../components/AudioControl';
import { TranscriptArea } from '../components/TranscriptArea';
import { SummarySection } from '../components/SummarySection';
import { Chatbot } from '../components/Chatbot';
import type { ChatMessage } from '../components/Chatbot';
import { translateText, summarizeText, answerFromTranscript } from '../services/geminiService';
import * as audioService from '../services/audioService';
import * as ttsService from '../services/ttsService';
import * as sessionService from '../services/sessionService';
import type { MeetingSessionData } from '../services/sessionService';
import { RecordingState, SummaryType } from '../types';
import type { LanguageOption, SummaryContent, AppSettings } from '../types';
import { INITIAL_SUMMARY_CONTENT, SUPPORTED_LANGUAGES } from '../constants';
import { MicIcon, DownloadIcon, BrainIcon, LanguagesIcon, ChatBubbleIcon, FileAudioIcon, VolumeUpIcon, EditIcon, UserCircleIcon, LogoutIcon, SaveIcon, CogIcon, ArchiveIcon, LoadIcon, TrashIcon, SettingsIcon, MicOffIcon } from '../components/icons/FeatureIcons';
import { SpeakerOnIcon, SpeakerOffIcon, PlayIcon, StopIcon, PauseIcon } from '../components/icons/MediaIcons';
import { LoadingSpinner } from '../LoadingSpinner';
import { PDFDownloadLink } from '@react-pdf/renderer';

// import { DocumentTextIcon } from '../components/icons/FeatureIcons'; // Một icon mới cho đẹp

// ==================================================================
// == BƯỚC 1: ĐỊNH NGHĨA CUSTOM HOOK useSmartScroll (CÔNG CỤ MỚI) ==
// ==================================================================
/**
 * Một custom hook để tự động cuộn một phần tử xuống dưới cùng một cách thông minh.
 * Nó chỉ cuộn khi người dùng đã ở gần cuối của vùng chứa.
 * @param dependency - Mảng dữ liệu mà khi thay đổi sẽ kích hoạt kiểm tra cuộn (ví dụ: [messages]).
 * @returns Một ref để gắn vào phần tử DOM có thể cuộn.
 */
export const useSmartScroll = (dependency: any[]): React.RefObject<HTMLDivElement> => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Khoảng đệm (buffer) để tăng độ chính xác, phòng trường hợp có padding/margin
    const scrollBuffer = 20; 

    // Kiểm tra xem người dùng có đang ở gần đáy của vùng chứa hay không
    const isScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + scrollBuffer;

    // Chỉ tự động cuộn xuống dưới cùng nếu người dùng ĐANG ở dưới cùng
    if (isScrolledToBottom) {
      container.scrollTop = container.scrollHeight;
    }

  }, [dependency]); // Chỉ chạy khi dependency thay đổi

  return containerRef;
};


interface MainPageProps {
  userData: { name: string; id: string | null };
  appSettings: AppSettings;
  onLogout: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  navigateTo: (route: 'settings') => void;
  onSettingsChange: (newSettings: Partial<AppSettings>) => Promise<void>;
}

export const MainPage: React.FC<MainPageProps> = ({ 
    userData, 
    appSettings, 
    onLogout, 
    showToast, 
    navigateTo,
    onSettingsChange
}) => {
  const [currentRecordingState, setCurrentRecordingState] = useState<RecordingState>(RecordingState.Idle);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
    const [isClient, setIsClient] = useState(false);

  const [sourceLanguage, setSourceLanguage] = useState<LanguageOption>(appSettings.sourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState<LanguageOption>(appSettings.targetLanguage);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const [meetingTranscript, setMeetingTranscript] = useState<string>('');
  const [editedTranscript, setEditedTranscript] = useState<string | null>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState<boolean>(false);
  const [fullTranslatedTranscript, setFullTranslatedTranscript] = useState<string>('');
  const [summary, setSummary] = useState<SummaryContent>(INITIAL_SUMMARY_CONTENT);
  const [chatbotMessages, setChatbotMessages] = useState<ChatMessage[]>([]);
  
  const [isUiLocked, setIsUiLocked] = useState<boolean>(false); 
  
  const [isGeminiSummaryLoading, setIsGeminiSummaryLoading] = useState<SummaryType | null>(null);
  const [isGeminiChatbotLoading, setIsGeminiChatbotLoading] = useState<boolean>(false);
  const [isGeminiTranslationLoading, setIsGeminiTranslationLoading] = useState<boolean>(false);

  const [canSpeakCurrentTargetLang, setCanSpeakCurrentTargetLang] = useState<boolean>(false);
  const [isTtsActive, setIsTtsActive] = useState<boolean>(false); 
  const [isTtsPaused, setIsTtsPaused] = useState<boolean>(false);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);


  const [savedMeetingSessions, setSavedMeetingSessions] = useState<MeetingSessionData[]>([]);
  const [loadedMeetingSessionId, setLoadedMeetingSessionId] = useState<string | null>(null);

  const timerIntervalRef = useRef<number | null>(null);
  const translationQueueRef = useRef<string[]>([]);
  const isProcessingTranslationQueueRef = useRef<boolean>(false);
  const fullRecordingAudioBlobRef = useRef<Blob | null>(null);
  const fullRecordingAudioBlobURL = useRef<string | null>(null);
  const micVolumeLevelRef = useRef<number>(0);
  const micClarityHintRef = useRef<'low' | 'normal'>('normal');
  const micErrorRef = useRef<boolean>(false);
  const transcriptEditAreaRef = useRef<HTMLTextAreaElement>(null);
  

  const transcriptContainerRef = useSmartScroll([meetingTranscript]);
  const translationContainerRef = useSmartScroll([fullTranslatedTranscript]);
  const chatbotContainerRef = useSmartScroll([chatbotMessages]);

  // Sync language state with AppSettings when props change
    useEffect(() => {
        setSourceLanguage(appSettings.sourceLanguage);
    }, [appSettings.sourceLanguage]);

    useEffect(() => {
        setTargetLanguage(appSettings.targetLanguage);
        // When target language changes, clear translation and cancel TTS
        setFullTranslatedTranscript(''); 
        ttsService.cancel();
    }, [appSettings.targetLanguage]);


  useEffect(() => {
    if (userData.id) { // Only load meeting sessions if user is authenticated
      setSavedMeetingSessions(sessionService.listMeetingSessions());
    } else {
      setSavedMeetingSessions([]);
      setLoadedMeetingSessionId(null);
    }
  }, [userData.id]); // Depend on userData.id to reload sessions on login/logout

  const resetForNewMeetingSession = () => {
    setMeetingTranscript(''); 
    setEditedTranscript(null);
    setIsEditingTranscript(false);
    setFullTranslatedTranscript('');
    setSummary(INITIAL_SUMMARY_CONTENT);
    setChatbotMessages([]);
    fullRecordingAudioBlobRef.current = null;
    if (fullRecordingAudioBlobURL.current) {
        URL.revokeObjectURL(fullRecordingAudioBlobURL.current);
        fullRecordingAudioBlobURL.current = null;
    }
    ttsService.cancel(); 
    translationQueueRef.current = [];
    setLoadedMeetingSessionId(null); 
    setIsMicMuted(audioService.getIsMicMuted()); // Sync with service state on reset
  };

  const processTranslationQueue = useCallback(async () => {
    if (isProcessingTranslationQueueRef.current || translationQueueRef.current.length === 0) {
      if (translationQueueRef.current.length === 0) isProcessingTranslationQueueRef.current = false; 
      return;
    }
    isProcessingTranslationQueueRef.current = true;
    setIsGeminiTranslationLoading(true);

    const chunkToProcess = translationQueueRef.current.shift(); 
    
    if (chunkToProcess) {
      let translatedChunk = '';
      const isSameLanguage = sourceLanguage.code === targetLanguage.code;

      if (!isSameLanguage) {
        try {
          translatedChunk = await translateText(chunkToProcess, sourceLanguage.code, targetLanguage.code);
        } catch (e) {
          console.error("Lỗi dịch thuật:", e);
          showToast(`Lỗi dịch thuật: ${(e as Error).message}`, 'error');
        }
      }
      
      const textForDisplay = isSameLanguage ? chunkToProcess : (translatedChunk || `[Dịch lỗi cho: "${chunkToProcess.substring(0,20)}..."]`);
      setFullTranslatedTranscript(prev => {
        const newFullTranslation = prev ? `${prev}\n${textForDisplay}` : textForDisplay;
        const currentActiveMeetingSessionId = sessionService.getCurrentActiveMeetingSessionId();
        if (currentActiveMeetingSessionId && userData.id) {
            sessionService.updateCurrentMeetingSessionData(currentActiveMeetingSessionId, { translatedTranscript: newFullTranslation });
        }
        return newFullTranslation;
      });

      // Removed automatic speaking of individual chunks here
      // if (autoSpeakTranslation && canSpeakCurrentTargetLang && textToSpeak.trim()) {
      //   ttsService.speak(textToSpeak, targetLanguage.code, false); 
      // }
    }
    
    setIsGeminiTranslationLoading(false);
    isProcessingTranslationQueueRef.current = false; 

    if (translationQueueRef.current.length > 0) {
      processTranslationQueue();
    }
  }, [sourceLanguage.code, targetLanguage.code, /* autoSpeakTranslation, */ /* canSpeakCurrentTargetLang, */ userData.id, showToast]);


  const handleAudioStateChange = useCallback((newState: RecordingState, details?: { errorMessage?: string; fullAudioBlob?: Blob | null }) => {
    setCurrentRecordingState(newState);
    if (details?.errorMessage) {
      showToast(`Lỗi Ghi Âm: ${details.errorMessage}`, 'error');
    }
    if (details?.fullAudioBlob) {
      fullRecordingAudioBlobRef.current = details.fullAudioBlob;
      if (fullRecordingAudioBlobURL.current) URL.revokeObjectURL(fullRecordingAudioBlobURL.current);
      fullRecordingAudioBlobURL.current = URL.createObjectURL(details.fullAudioBlob);
      const currentActiveMeetingSessionId = sessionService.getCurrentActiveMeetingSessionId();
      if (currentActiveMeetingSessionId) {
        sessionService.updateCurrentMeetingSessionData(currentActiveMeetingSessionId, { audioBlobUrl: fullRecordingAudioBlobURL.current, audioMimeType: details.fullAudioBlob.type });
      }
    }
    if (newState === RecordingState.Error) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setIsUiLocked(false); 
    }
    if (newState === RecordingState.Stopped || newState === RecordingState.Idle) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
       setIsUiLocked(false);
       const currentActiveMeetingSessionId = sessionService.getCurrentActiveMeetingSessionId();
       if (currentActiveMeetingSessionId && userData.id) {
         showToast("Bản ghi âm đã hoàn tất. Bạn có thể lưu phiên này.", 'info');
       }
    }
    if (newState === RecordingState.Initializing) {
        setIsUiLocked(true); 
        resetForNewMeetingSession();
        if (userData.id) { // Only start new meeting session if user logged in
            sessionService.startNewMeetingSession(sourceLanguage.code, targetLanguage.code);
            setLoadedMeetingSessionId(null);
        }
    }
     if (newState === RecordingState.Recording) {
        setIsUiLocked(false); 
    }
  }, [userData.id, sourceLanguage.code, targetLanguage.code, showToast]);

  const handleNewTranscriptChunk = useCallback((chunk: string) => {
    if (isEditingTranscript) return; 
    setMeetingTranscript(prev => {
      const newTranscript = prev ? `${prev}\n${chunk}` : chunk;
      const currentActiveMeetingSessionId = sessionService.getCurrentActiveMeetingSessionId();
      if (currentActiveMeetingSessionId && userData.id) {
        sessionService.updateCurrentMeetingSessionData(currentActiveMeetingSessionId, { transcript: newTranscript });
      }
      return newTranscript;
    });
    translationQueueRef.current.push(chunk);
    if (!isProcessingTranslationQueueRef.current) {
      processTranslationQueue();
    }
  }, [isEditingTranscript, userData.id, processTranslationQueue]);

  const handleMicVolumeUpdate = useCallback((volume: number, clarityHint: 'low' | 'normal') => {
      micVolumeLevelRef.current = volume;
      micClarityHintRef.current = clarityHint;
  }, []);

  const handleMicMuteStateChange = useCallback((muted: boolean) => {
    setIsMicMuted(muted);
  }, []);
  
  const handleTTSError = useCallback((message: string) => {
    console.error("MainPage.tsx - TTS Error reported:", message);
    showToast(`Lỗi TTS: ${message}`, 'error');
    setIsTtsActive(false);
    setIsTtsPaused(false);
  }, [showToast]);

  const handleTTSActivityChange = useCallback((isSpeaking: boolean, isPaused: boolean) => {
    setIsTtsActive(isSpeaking);
    setIsTtsPaused(isPaused);
  }, []);

  const handleTTSLanguageSupportChange = useCallback((langCode: string, isSupported: boolean) => {
    if (langCode === targetLanguage.code) {
      setCanSpeakCurrentTargetLang(isSupported);
    }
  }, [targetLanguage.code]);


 useEffect(() => {
    audioService.initAudioService({
      onStateChange: handleAudioStateChange,
      onNewTranscriptChunk: handleNewTranscriptChunk,
      onVolumeUpdate: handleMicVolumeUpdate,
      onMicMuteStateChange: handleMicMuteStateChange,
    });
    setIsMicMuted(audioService.getIsMicMuted()); // Initialize from service

    ttsService.init(
      {
        onError: handleTTSError,
        onActivityStateChange: handleTTSActivityChange,
        onLanguageSupportChange: handleTTSLanguageSupportChange,
      },
      targetLanguage.code 
    );
    setCanSpeakCurrentTargetLang(ttsService.isLanguageSupported(targetLanguage.code));

    return () => {
      audioService.cleanupAudioService();
      ttsService.cleanup();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (fullRecordingAudioBlobURL.current) URL.revokeObjectURL(fullRecordingAudioBlobURL.current);
    };
  }, [handleAudioStateChange, handleNewTranscriptChunk, handleMicVolumeUpdate, handleMicMuteStateChange, handleTTSError, handleTTSActivityChange, handleTTSLanguageSupportChange, targetLanguage.code]);


  useEffect(() => {
      setCanSpeakCurrentTargetLang(ttsService.isLanguageSupported(targetLanguage.code));
  }, [targetLanguage.code]);


  const currentActiveTranscript = isEditingTranscript ? (editedTranscript ?? meetingTranscript) : meetingTranscript;
  const currentActiveMeetingSessionId = sessionService.getCurrentActiveMeetingSessionId();

  const handleStartRecording = useCallback(async () => {
    if (currentRecordingState !== RecordingState.Idle && currentRecordingState !== RecordingState.Stopped && currentRecordingState !== RecordingState.Error) return;
    if (!userData.id) {
        showToast("Vui lòng đăng nhập để bắt đầu ghi âm.", "error");
        return;
    }
    
    setElapsedTime(0);
    micErrorRef.current = false; 
    setIsUiLocked(true); 
    setIsMicMuted(false); // Ensure UI reflects unmuted state at start

    try {
      await audioService.startAudioProcessing(sourceLanguage.code); 
      // audioService will call onMicMuteStateChange(false) internally on start
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } catch (e) { 
      console.error("Lỗi trực tiếp khi bắt đầu ghi âm trong MainPage.tsx:", e);
      showToast(`Lỗi bắt đầu ghi âm: ${(e as Error).message}`, 'error');
      setCurrentRecordingState(RecordingState.Error);
      setIsUiLocked(false);
      const activeMeetingId = sessionService.getCurrentActiveMeetingSessionId();
      if (activeMeetingId) sessionService.deleteMeetingSession(activeMeetingId); // Clean up failed session
    }
  }, [currentRecordingState, sourceLanguage.code, userData.id, showToast]);

  const handleStopRecording = useCallback(() => {
    audioService.stopAudioProcessing(); // This will trigger onMicMuteStateChange(false) from service
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const activeMeetingId = sessionService.getCurrentActiveMeetingSessionId();
    if (isEditingTranscript) { 
        const finalTranscript = editedTranscript ?? meetingTranscript;
        setMeetingTranscript(finalTranscript);
        if (activeMeetingId && userData.id) {
            sessionService.updateCurrentMeetingSessionData(activeMeetingId, { transcript: finalTranscript, isComplete: true });
        }
        setIsEditingTranscript(false);
    } else if (activeMeetingId && userData.id) {
        sessionService.updateCurrentMeetingSessionData(activeMeetingId, { isComplete: true });
    }
  }, [isEditingTranscript, editedTranscript, meetingTranscript, userData.id]);
  
  const handleToggleMicMute = useCallback(() => {
      if (currentRecordingState === RecordingState.Recording) {
        audioService.toggleMicrophoneMute();
        // setIsMicMuted will be updated via the onMicMuteStateChange callback
      }
  }, [currentRecordingState]);


  const handleSummarize = useCallback(async (type: SummaryType) => {
    if (!currentActiveTranscript.trim() || isGeminiSummaryLoading) return;
    setIsGeminiSummaryLoading(type);
    try {
      const summaryResult = await summarizeText(currentActiveTranscript, type, sourceLanguage.code);
      setSummary(prev => {
        const newSummary = { ...prev, [type]: summaryResult };
        const activeMeetingId = loadedMeetingSessionId || sessionService.getCurrentActiveMeetingSessionId();
        if (activeMeetingId && userData.id) {
            sessionService.updateCurrentMeetingSessionData(activeMeetingId, { summary: newSummary });
        }
        return newSummary;
      });
    } catch (e) {
      console.error(`Lỗi tạo tóm tắt (${type}):`, e);
      showToast(`Lỗi tạo tóm tắt (${type}): ${(e as Error).message}`, 'error');
    } finally {
      setIsGeminiSummaryLoading(null);
    }
  }, [currentActiveTranscript, sourceLanguage.code, isGeminiSummaryLoading, loadedMeetingSessionId, userData.id, showToast]);

  const handleChatbotSendMessage = useCallback(async (message: string) => {
    const newUserMessage: ChatMessage = { id: Date.now().toString(), text: message, sender: 'user' };
    setChatbotMessages(prev => [...prev, newUserMessage]);

    if (!currentActiveTranscript.trim()) {
       const noTranscriptBotMessage: ChatMessage = { id: Date.now().toString() + '_bot', text: "Xin lỗi, chưa có nội dung phiên âm để tôi có thể trả lời.", sender: 'bot' };
       setChatbotMessages(prev => [...prev, noTranscriptBotMessage]);
       return;
    }
    setIsGeminiChatbotLoading(true);
    try {
      const botResponse = await answerFromTranscript(currentActiveTranscript, message, sourceLanguage.name);
      const newBotMessage: ChatMessage = { id: Date.now().toString() + '_bot', text: botResponse, sender: 'bot' };
      setChatbotMessages(prev => [...prev, newBotMessage]);
    } catch (e) {
      console.error("Lỗi chatbot:", e);
      const errorBotMessage: ChatMessage = { id: Date.now().toString() + '_bot_error', text: `Lỗi từ bot: ${(e as Error).message}`, sender: 'bot' };
      setChatbotMessages(prev => [...prev, errorBotMessage]);
      showToast(`Lỗi chatbot: ${(e as Error).message}`, 'error');
    } finally {
      setIsGeminiChatbotLoading(false);
    }
  }, [currentActiveTranscript, sourceLanguage.name, showToast]);
  
  const downloadFile = useCallback((content: string | Blob, filename: string, mimeType: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = content instanceof Blob && content.type ? URL.createObjectURL(blob) : (typeof content === 'string' && content.startsWith('blob:')) ? content : URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (!(content instanceof Blob && content.type) && !(typeof content === 'string' && content.startsWith('blob:'))) {
        URL.revokeObjectURL(url);
    }
  }, []);

  const handleDownloadTranscript = useCallback(() => {
    if (!currentActiveTranscript.trim()) {
      showToast("Không có nội dung phiên âm để tải.", 'info');
      return;
    }
    downloadFile(currentActiveTranscript, `transcript_${sourceLanguage.code}.txt`, 'text/plain;charset=utf-8');
  }, [currentActiveTranscript, sourceLanguage.code, downloadFile, showToast]);

  const handleDownloadTranslatedTranscript = useCallback(() => {
    if (!fullTranslatedTranscript.trim()) {
      showToast("Không có nội dung dịch để tải.", 'info');
      return;
    }
    downloadFile(fullTranslatedTranscript, `translation_${targetLanguage.code}.txt`, 'text/plain;charset=utf-8');
  }, [fullTranslatedTranscript, targetLanguage.code, downloadFile, showToast]);

  const handleDownloadSummary = useCallback(() => {
    const summaryContent = 
`Điểm chính:\n${summary[SummaryType.KeyPoints] || 'Chưa có.'}\n\nMục hành động:\n${summary[SummaryType.ActionItems] || 'Chưa có.'}`;
    if (!summary[SummaryType.KeyPoints] && !summary[SummaryType.ActionItems]) {
         showToast("Không có nội dung tóm tắt để tải.", 'info');
         return;
    }
    downloadFile(summaryContent, 'summary.txt', 'text/plain;charset=utf-8');
  }, [summary, downloadFile, showToast]);

  const handleDownloadFullAudio = useCallback(() => {
    const audioUrlToDownload = loadedMeetingSessionId && sessionService.getMeetingSession(loadedMeetingSessionId)?.audioBlobUrl 
        ? sessionService.getMeetingSession(loadedMeetingSessionId)?.audioBlobUrl
        : fullRecordingAudioBlobURL.current;
    const audioMimeType = loadedMeetingSessionId && sessionService.getMeetingSession(loadedMeetingSessionId)?.audioMimeType
        ? sessionService.getMeetingSession(loadedMeetingSessionId)?.audioMimeType
        : fullRecordingAudioBlobRef.current?.type;

    if (!audioUrlToDownload) {
         showToast("Không có bản ghi âm thanh để tải.", 'info');
         return;
    }
    downloadFile(audioUrlToDownload, `recording.${audioMimeType?.split('/')[1] || 'webm'}`, audioMimeType || 'audio/webm');
  }, [downloadFile, loadedMeetingSessionId, showToast]);

  // Removed toggleAutoSpeak as auto-speak per segment is removed

  const handleSpeakAllProcessedText = useCallback(() => {
    const textToSpeak = sourceLanguage.code === targetLanguage.code ? currentActiveTranscript : fullTranslatedTranscript;
    if (textToSpeak.trim() && canSpeakCurrentTargetLang && !isTtsActive) {
      ttsService.speak(textToSpeak, targetLanguage.code, true); 
    }
  }, [currentActiveTranscript, fullTranslatedTranscript, targetLanguage.code, sourceLanguage.code, canSpeakCurrentTargetLang, isTtsActive]);

  const handleToggleEditTranscript = () => {
    setIsEditingTranscript(prev => {
        if (!prev) { 
            setEditedTranscript(currentActiveTranscript); 
            setTimeout(() => transcriptEditAreaRef.current?.focus(), 0);
        }
        return !prev;
    });
  };
  
  const handleSaveEditedTranscript = useCallback(() => {
    const finalTranscript = editedTranscript ?? currentActiveTranscript;
    setMeetingTranscript(finalTranscript);
    setIsEditingTranscript(false);
    
    const activeMeetingId = loadedMeetingSessionId || sessionService.getCurrentActiveMeetingSessionId();
    if (activeMeetingId && userData.id) {
        sessionService.updateCurrentMeetingSessionData(activeMeetingId, { transcript: finalTranscript });
    }

    showToast("Phiên âm đã được cập nhật. Dịch và tóm tắt sẽ được làm mới.", 'success');
    translationQueueRef.current = finalTranscript.split('\n').filter(line => line.trim() !== '');
    setFullTranslatedTranscript(''); 
    if (!isProcessingTranslationQueueRef.current) {
        processTranslationQueue(); 
    }
    setSummary(INITIAL_SUMMARY_CONTENT); 
  }, [editedTranscript, currentActiveTranscript, loadedMeetingSessionId, userData.id, processTranslationQueue, showToast]);


  const handleSaveCurrentMeetingSession = useCallback(() => {
    if (!userData.id) {
        showToast("Vui lòng đăng nhập để lưu phiên.", 'error');
        return;
    }
    if (!currentActiveTranscript.trim() && !fullRecordingAudioBlobURL.current) {
        showToast("Không có dữ liệu để lưu trong phiên hiện tại.", 'info');
        return;
    }

    const activeMeetingId = sessionService.getCurrentActiveMeetingSessionId();
    if (!activeMeetingId) { 
        showToast("Không có phiên hoạt động để lưu.", 'error');
        return;
    }
    
    sessionService.updateCurrentMeetingSessionData(activeMeetingId, { 
        transcript: currentActiveTranscript, 
        translatedTranscript: fullTranslatedTranscript,
        summary: summary,
        audioBlobUrl: fullRecordingAudioBlobURL.current,
        audioMimeType: fullRecordingAudioBlobRef.current?.type,
        isComplete: currentRecordingState !== RecordingState.Recording, 
    });
    
    const savedSession = sessionService.saveCurrentMeetingSession(); 
    if (savedSession) {
        setSavedMeetingSessions(sessionService.listMeetingSessions());
        showToast(`Phiên "${savedSession.name || 'Hiện tại'}" đã được lưu!`, 'success');
    } else {
        showToast("Lưu phiên thất bại.", 'error');
    }
  }, [
    userData.id, 
    currentActiveTranscript, 
    fullRecordingAudioBlobURL.current, 
    fullTranslatedTranscript, 
    summary, 
    fullRecordingAudioBlobRef.current,
    currentRecordingState,
    showToast
  ]);

  const handleLoadMeetingSession = (sessionId: string) => {
    if (!userData.id) return;
    const session = sessionService.getMeetingSession(sessionId);
    if (session) {
        resetForNewMeetingSession(); 

        onSettingsChange({ 
            sourceLanguage: SUPPORTED_LANGUAGES.find(l => l.code === session.sourceLang) || sourceLanguage,
            targetLanguage: SUPPORTED_LANGUAGES.find(l => l.code === session.targetLang) || targetLanguage,
        });
        // setSourceLanguage will be updated by useEffect watching appSettings.sourceLanguage
        // setTargetLanguage will be updated by useEffect watching appSettings.targetLanguage

        setMeetingTranscript(session.transcript || '');
        setEditedTranscript(session.transcript || ''); 
        setFullTranslatedTranscript(session.translatedTranscript || '');
        setSummary(session.summary || INITIAL_SUMMARY_CONTENT);
        setChatbotMessages([]); 

        if (session.audioBlobUrl) {
            fullRecordingAudioBlobURL.current = session.audioBlobUrl;
        } else {
            fullRecordingAudioBlobURL.current = null;
        }
        fullRecordingAudioBlobRef.current = null; 

        setCurrentRecordingState(RecordingState.Stopped); 
        setElapsedTime(0); 
        setIsEditingTranscript(false);
        setLoadedMeetingSessionId(session.id);
        showToast(`Đã tải phiên: ${session.name}`, 'success');
    } else {
        showToast("Không thể tải phiên đã chọn.", 'error');
    }
  };

  const handleDeleteMeetingSession = (sessionId: string) => {
    if (!userData.id) return;
    if (confirm("Bạn có chắc chắn muốn xóa phiên này? Hành động này không thể hoàn tác.")) {
        sessionService.deleteMeetingSession(sessionId);
        setSavedMeetingSessions(sessionService.listMeetingSessions());
        if (loadedMeetingSessionId === sessionId) {
            resetForNewMeetingSession(); 
        }
        showToast("Đã xóa phiên.", 'success');
    }
  };

  const handleSourceLangChange = (lang: LanguageOption) => {
    if (isRecordingInProgress) { showToast("Không thể đổi ngôn ngữ khi đang ghi âm.", "error"); return; }
    onSettingsChange({ sourceLanguage: lang }); // Propagate to App settings
    const activeMeetingId = sessionService.getCurrentActiveMeetingSessionId();
    if (activeMeetingId) sessionService.updateCurrentMeetingSessionData(activeMeetingId, { sourceLang: lang.code });
  };

  const handleTargetLangChange = (lang: LanguageOption) => {
    if (isRecordingInProgress) { showToast("Không thể đổi ngôn ngữ khi đang ghi âm.", "error"); return; }
    onSettingsChange({ targetLanguage: lang }); // Propagate to App settings
    // setFullTranslatedTranscript, ttsService.cancel will be handled by useEffect on targetLanguage change
    const activeMeetingId = sessionService.getCurrentActiveMeetingSessionId();
    if (activeMeetingId) sessionService.updateCurrentMeetingSessionData(activeMeetingId, { targetLang: lang.code });
  };


  const transcriptLoadingMessage = currentRecordingState === RecordingState.Initializing ? (
    <div className="text-center text-slate-400">
      <LoadingSpinner /> <p className="mt-2">Đang khởi tạo luồng âm thanh...</p>
    </div>
  ) : currentRecordingState === RecordingState.Recording && !currentActiveTranscript && !loadedMeetingSessionId ? (
    <div className="text-center text-slate-400">
      <LoadingSpinner /> <p className="mt-2">Đang chờ đoạn phiên âm đầu tiên...</p>
    </div>
  ) : !currentActiveTranscript && !loadedMeetingSessionId ? (
    <p className="text-slate-400 italic text-center">Chưa có nội dung phiên âm. Bắt đầu ghi âm hoặc tải phiên.</p>
  ) : null;

  const translationLoadingMessage = isGeminiTranslationLoading && !fullTranslatedTranscript ? (
     <div className="text-center text-slate-400">
      <LoadingSpinner /> <p className="mt-2">Đang dịch...</p>
    </div>
  ) : !fullTranslatedTranscript && sourceLanguage.code !== targetLanguage.code && currentActiveTranscript && !loadedMeetingSessionId ? (
      <p className="text-slate-400 italic text-center">Đang chờ dịch...</p>
  ) : !fullTranslatedTranscript && currentActiveTranscript && sourceLanguage.code !== targetLanguage.code ? (
      <p className="text-slate-400 italic text-center">Bản dịch chưa có hoặc cần tạo lại.</p>
  ) : !fullTranslatedTranscript && sourceLanguage.code === targetLanguage.code ? null
    : !currentActiveTranscript ? (
      <p className="text-slate-400 italic text-center">Chưa có nội dung dịch.</p>
    ) : null;
  
  const audioControlIsLoading = currentRecordingState === RecordingState.Initializing || currentRecordingState === RecordingState.Stopping;
  const isRecordingInProgress = [RecordingState.Initializing, RecordingState.Recording, RecordingState.Stopping].includes(currentRecordingState);
  
  const summaryButtonsDisabled = isGeminiSummaryLoading !== null || !currentActiveTranscript.trim() || (isEditingTranscript && !loadedMeetingSessionId); 
  const chatInputDisabled = isGeminiChatbotLoading || !currentActiveTranscript.trim() || (isEditingTranscript && !loadedMeetingSessionId);
  
  const ttsPrimaryTextAvailable = sourceLanguage.code === targetLanguage.code ? currentActiveTranscript.trim() : fullTranslatedTranscript.trim();

  return (
    <div className={`min-h-screen bg-gradient-to-br text-slate-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 ${appSettings.theme === 'dark' ? 'from-slate-900 to-slate-800' : 'from-sky-100 to-sky-300 text-slate-800'}`}>
      <header className="w-full max-w-7xl flex justify-between items-center mb-6 pb-6 border-b border-slate-700">
        <div className="text-left">
            <h1 className={`text-3xl sm:text-4xl font-bold ${appSettings.theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`}>Trợ lý cuộc họp AI</h1>
            <p className={`${appSettings.theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-1 text-xs sm:text-sm`}>Ghi âm, Phiên âm, Dịch, Tóm tắt & Hỏi đáp</p>
        </div>
        <div className="flex items-center space-x-3">
            {userData.id && (
                <div className={`flex items-center text-sm px-3 py-1.5 rounded-lg shadow ${appSettings.theme === 'dark' ? 'bg-slate-700 text-sky-400' : 'bg-white text-sky-700'}`}>
                    <UserCircleIcon className="w-5 h-5 mr-2"/>
                    <span>Chào, {userData.name}!</span>
                </div>
            )}
            <button
                onClick={() => navigateTo('settings')}
                className={`p-2 rounded-lg shadow-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${appSettings.theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 focus:ring-slate-500 focus:ring-offset-slate-900' : 'bg-white hover:bg-slate-100 text-slate-700 focus:ring-sky-500 focus:ring-offset-sky-100'}`}
                title="Cài đặt"
            >
                <SettingsIcon className="w-5 h-5" />
            </button>
            <button 
                onClick={onLogout}
                className="flex items-center bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                title="Đăng xuất"
            >
                <LogoutIcon className="w-5 h-5 mr-1.5"/>
                Đăng xuất
            </button>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-4">
        <section className="md:col-span-2 space-y-6">
          <div className={`p-6 rounded-xl shadow-2xl ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <AudioControl
                recordingState={currentRecordingState}
                elapsedTime={elapsedTime}
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                supportedLanguages={SUPPORTED_LANGUAGES}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onSourceLangChange={handleSourceLangChange}
                onTargetLangChange={handleTargetLangChange}
                isLoading={audioControlIsLoading}
                isSttSupported={true} 
                micVolumeLevel={micVolumeLevelRef.current}
                micError={micErrorRef.current}
                micInputClarityHint={micClarityHintRef.current}
                isSessionLoaded={!!loadedMeetingSessionId}
                theme={appSettings.theme}
                isMicMuted={isMicMuted}
                onToggleMicMute={handleToggleMicMute}
                canToggleMute={currentRecordingState === RecordingState.Recording}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`space-y-1 p-6 rounded-xl shadow-2xl ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-2">
                    <h2 className={`text-xl font-semibold flex items-center ${appSettings.theme === 'dark' ? 'text-sky-300' : 'text-sky-700'}`}>
                    <MicIcon className="w-6 h-6 mr-2" />
                    Phiên âm ({sourceLanguage.name})
                    </h2>
                    {(!isRecordingInProgress || loadedMeetingSessionId) && currentActiveTranscript.trim() && (
                        <div className="flex items-center space-x-2">
                            {isEditingTranscript ? (
                                <button
                                    onClick={handleSaveEditedTranscript}
                                    className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors text-xs flex items-center"
                                    title="Lưu thay đổi phiên âm"
                                >
                                <SaveIcon className="w-4 h-4 mr-1"/> Lưu
                                </button>
                            ) : null}
                            <button
                                onClick={handleToggleEditTranscript}
                                className={`p-2 rounded-md ${isEditingTranscript ? 'bg-yellow-500 hover:bg-yellow-600' : (appSettings.theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-300 hover:bg-slate-400')} text-white transition-colors`}
                                title={isEditingTranscript ? "Hủy chỉnh sửa" : "Chỉnh sửa phiên âm"}
                            >
                                <EditIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
                <TranscriptArea 
                    content={transcriptLoadingMessage || currentActiveTranscript} 
                    isEditing={isEditingTranscript}
                    onEdit={(newText) => setEditedTranscript(newText)}
                    textareaRef={transcriptEditAreaRef}
                    theme={appSettings.theme}
                />
            </div>

            <div className={`space-y-1 p-6 rounded-xl shadow-2xl ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-2">
                    <h2 className={`text-xl font-semibold flex items-center ${appSettings.theme === 'dark' ? 'text-teal-300' : 'text-teal-700'}`}>
                        <LanguagesIcon className="w-6 h-6 mr-2" />
                        Bản dịch ({targetLanguage.name})
                    </h2>
                    {ttsPrimaryTextAvailable && (
                        <div className="flex items-center space-x-2">
                            {/* Auto-speak toggle removed */}
                            {canSpeakCurrentTargetLang && (
                            <button
                                onClick={handleSpeakAllProcessedText}
                                disabled={!ttsPrimaryTextAvailable || isTtsActive || isEditingTranscript}
                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Phát toàn bộ bản dịch/phiên âm"
                            >
                                <VolumeUpIcon className="w-5 h-5" />
                            </button>
                            )}
                            {isTtsActive && canSpeakCurrentTargetLang && (
                            <>
                                <button onClick={isTtsPaused ? ttsService.resume : ttsService.pause} className={`${appSettings.theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-300 hover:bg-slate-400'} text-white p-2 rounded-md`} title={isTtsPaused ? "Tiếp tục" : "Tạm dừng"}><PlayIcon className="w-5 h-5" /></button>
                                <button onClick={ttsService.cancel} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-md" title="Dừng hẳn"><StopIcon className="w-5 h-5" /></button>
                            </>
                            )}
                        </div>
                    )}
                </div>
                <TranscriptArea 
                  content={translationLoadingMessage || fullTranslatedTranscript} 
                  theme={appSettings.theme}
                />
                {/* Warning message for auto-speak removed as feature is removed */}
                {!canSpeakCurrentTargetLang && sourceLanguage.code !== targetLanguage.code && ttsPrimaryTextAvailable && (
                    <p className={`text-xs text-center mt-1 ${appSettings.theme === 'dark' ? 'text-yellow-600' : 'text-yellow-700'}`}>Trình duyệt không hỗ trợ phát âm thanh cho ngôn ngữ "{targetLanguage.name}".</p>
                )}
            </div>
          </div>
          
          {userData.id && !isRecordingInProgress && (currentActiveTranscript.trim() || fullRecordingAudioBlobURL.current) && !loadedMeetingSessionId && (
            <div className={`mt-4 p-6 rounded-xl shadow-2xl flex justify-center ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                <button 
                    onClick={handleSaveCurrentMeetingSession}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition duration-150 flex items-center text-base"
                    title="Lưu trạng thái phiên âm, dịch, tóm tắt và âm thanh hiện tại (nếu có) vào danh sách phiên của bạn."
                >
                    <SaveIcon className="w-5 h-5 mr-2" />
                    Lưu Phiên Hiện Tại
                </button>
            </div>
          )}
        </section>

        <section className="md:col-span-1 space-y-6">
          <div className={`p-6 rounded-xl shadow-2xl ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-3 flex items-center ${appSettings.theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                <BrainIcon className="w-6 h-6 mr-2" />
                Tóm tắt nội dung
            </h2>
            <SummarySection
              summary={summary}
              onSummarize={handleSummarize}
              isLoading={isGeminiSummaryLoading}
              isProcessing={summaryButtonsDisabled}
              theme={appSettings.theme}
            />
          </div>
          
          <div className={`p-6 rounded-xl shadow-2xl ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-3 flex items-center ${appSettings.theme === 'dark' ? 'text-lime-300' : 'text-lime-700'}`}>
                <ChatBubbleIcon className="w-6 h-6 mr-2" />
                Hỏi & Đáp về cuộc họp
            </h2>
            <Chatbot
              chatMessages={chatbotMessages}
              onSendMessage={handleChatbotSendMessage}
              isChatbotLoading={chatInputDisabled}
              theme={appSettings.theme}
            />
          </div>

          <div className={`p-6 rounded-xl shadow-2xl ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <h2 className={`text-xl font-semibold mb-3 flex items-center ${appSettings.theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}>
                <DownloadIcon className="w-6 h-6 mr-2" />
                Tải xuống
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleDownloadTranscript} disabled={!currentActiveTranscript.trim() || isRecordingInProgress} className="bg-sky-500 hover:bg-sky-600 text-white font-medium py-2.5 px-4 rounded-lg shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm">
                <DownloadIcon className="w-4 h-4 mr-1.5" /> Phiên âm
              </button>
              <button onClick={handleDownloadTranslatedTranscript} disabled={!fullTranslatedTranscript.trim() || isRecordingInProgress} className="bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 px-4 rounded-lg shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm">
                <DownloadIcon className="w-4 h-4 mr-1.5" /> Bản dịch
              </button>
              <button onClick={handleDownloadSummary} disabled={(!summary[SummaryType.KeyPoints] && !summary[SummaryType.ActionItems]) || isRecordingInProgress} className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2.5 px-4 rounded-lg shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm">
                <DownloadIcon className="w-4 h-4 mr-1.5" /> Tóm tắt
              </button>
              <button 
                onClick={handleDownloadFullAudio} 
                disabled={(!fullRecordingAudioBlobURL.current && !sessionService.getMeetingSession(loadedMeetingSessionId || "")?.audioBlobUrl) || isRecordingInProgress} 
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg shadow-md transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm"
              >
                <FileAudioIcon className="w-4 h-4 mr-1.5" /> Âm thanh
              </button>
            </div>
          </div>
        
          {userData.id && (
            <div className={`p-6 rounded-xl shadow-2xl ${appSettings.theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold mb-3 flex items-center ${appSettings.theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}>
                    <ArchiveIcon className="w-6 h-6 mr-2" />
                    Phiên đã lưu của tôi
                </h2>
                {savedMeetingSessions.length === 0 ? (
                    <p className={`${appSettings.theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} italic text-center`}>Bạn chưa có phiên nào được lưu.</p>
                ) : (
                    <ul className={`space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-2 ${appSettings.theme === 'dark' ? 'scrollbar-thumb-slate-600 scrollbar-track-slate-700' : 'scrollbar-thumb-slate-400 scrollbar-track-slate-200'}`}>
                        {savedMeetingSessions.map(sess => (
                            <li key={sess.id} className={`p-3 rounded-md flex justify-between items-center transition-colors ${loadedMeetingSessionId === sess.id ? (appSettings.theme === 'dark' ? 'bg-sky-700' : 'bg-sky-200') : (appSettings.theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200')}`}>
                                <div>
                                    <span className={`font-medium text-sm ${appSettings.theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{sess.name || `Phiên ${new Date(sess.createdAt).toLocaleDateString()}`}</span>
                                    <p className={`text-xs ${appSettings.theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {new Date(sess.createdAt).toLocaleString()} ({sess.sourceLang} → {sess.targetLang})
                                    </p>
                                </div>
                                <div className="space-x-1.5">
                                    <button 
                                        onClick={() => handleLoadMeetingSession(sess.id)} 
                                        disabled={loadedMeetingSessionId === sess.id || isRecordingInProgress}
                                        className="p-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed" title="Tải phiên này">
                                        <LoadIcon className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => handleDeleteMeetingSession(sess.id)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded" title="Xóa phiên này">
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                <p className={`text-xs mt-3 text-center italic ${appSettings.theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Dữ liệu phiên được lưu trữ tạm thời trong trình duyệt của bạn.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

