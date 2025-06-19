
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import type { LanguageOption, SummaryContent, AppSettings, ActionTabType } from '../types';
import { INITIAL_SUMMARY_CONTENT, SUPPORTED_LANGUAGES } from '../constants';
import { MicIcon, DownloadIcon, BrainIcon, LanguagesIcon, ChatBubbleIcon, FileAudioIcon, VolumeUpIcon, EditIcon, UserCircleIcon, LogoutIcon, SaveIcon, CogIcon, ArchiveIcon, LoadIcon, TrashIcon, SettingsIcon, MicOffIcon, ListChecksIcon, LightbulbIcon } from '../components/icons/FeatureIcons';
import { SpeakerOnIcon, SpeakerOffIcon, PlayIcon, StopIcon, PauseIcon as MediaPauseIcon, RecordingStatusIcon } from '../components/icons/MediaIcons';
import { LoadingSpinner } from '../LoadingSpinner';
import { LanguageSelector } from '../components/LanguageSelector';
import { MicrophoneVolumeIndicator } from '../components/MicrophoneVolumeIndicator';
import { PDFDownloadLink, Document as PdfDocument, Page as PdfPage, Text as PdfText, View as PdfView, StyleSheet as PdfStyleSheet, Font as PdfFont } from '@react-pdf/renderer';

// // Cách 1: Font URL mới
PdfFont.register({
  family: 'NotoSans',
  fonts: [
    {
      src: '/fonts/NotoSans-Regular.ttf', // Đường dẫn từ public folder
      fontWeight: 'normal',
    }
  ]
});

const pdfStyles = PdfStyleSheet.create({
  page: {
    fontSize: 10,
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
    lineHeight: 1.5,
    fontFamily: 'NotoSans',
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
    fontFamily: 'NotoSans',
  },
  sectionTitle: {
    fontSize: 14,
    marginTop: 15,
    marginBottom: 8,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 3,
    fontFamily: 'NotoSans',
  },
  text: {
    textAlign: 'justify',
    fontFamily: 'NotoSans',
  },
  actionItemText: {
    marginBottom: 3,
    fontFamily: 'NotoSans',
  }
});



const MeetingReportPdf = ({ transcript, translation, summaryContent, sourceLangName, targetLangName }: {
  transcript: string;
  translation: string;
  summaryContent: SummaryContent;
  sourceLangName: string;
  targetLangName: string;
}) => (
  <PdfDocument>
    <PdfPage style={pdfStyles.page}>
      <PdfText style={pdfStyles.title}>Báo cáo Cuộc họp </PdfText>
      <PdfText style={pdfStyles.sectionTitle}>Phiên âm ({sourceLangName})</PdfText>
      <PdfText style={pdfStyles.text}>{transcript || "Chưa có nội dung."}</PdfText>
      {sourceLangName !== targetLangName && (
        <>
          <PdfText style={pdfStyles.sectionTitle}>Bản dịch ({targetLangName})</PdfText>
          <PdfText style={pdfStyles.text}>{translation || "Chưa có nội dung."}</PdfText>
        </>
      )}
      <PdfText style={pdfStyles.sectionTitle}>Tóm tắt - Điểm chính< /PdfText>
      <PdfText style={pdfStyles.text}>{summaryContent[SummaryType.KeyPoints] || "Chưa có nội dung."}</PdfText>
      <PdfText style={pdfStyles.sectionTitle}>Tóm tắt - Mục hành động </PdfText>
      {summaryContent[SummaryType.ActionItems] ? (
         summaryContent[SummaryType.ActionItems].split('\n').map((item, index) => (
            item.trim() && <PdfText key={index} style={pdfStyles.actionItemText}>- {item.trim()}</PdfText>
         ))
      ) : (
        <PdfText style={pdfStyles.text}>Chưa có nội dung.</PdfText>
      )}
    </PdfPage>
  </PdfDocument>
);

export const useSmartScroll = (dependency: any[]): React.RefObject<HTMLDivElement> => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const scrollBuffer = 20;
    const isScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + scrollBuffer;
    if (isScrolledToBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [dependency]);
  return containerRef;
};

interface MainPageProps {
  userData: { name: string; id: string | null };
  appSettings: AppSettings;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  navigateTo: (route: 'settings') => void;
  onSettingsChange: (newSettings: Partial<AppSettings>) => Promise<void>;
}

export const MainPage: React.FC<MainPageProps> = ({
    userData,
    appSettings,
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
  const [activeActionTab, setActiveActionTab] = useState<ActionTabType>('summary');

  const timerIntervalRef = useRef<number | null>(null);
  const translationQueueRef = useRef<string[]>([]);
  const isProcessingTranslationQueueRef = useRef<boolean>(false);
  const fullRecordingAudioBlobRef = useRef<Blob | null>(null);
  const fullRecordingAudioBlobURL = useRef<string | null>(null);
  const micVolumeLevelRef = useRef<number>(0);
  const micClarityHintRef = useRef<'low' | 'normal'>('normal');
  const micErrorRef = useRef<boolean>(false);
  const transcriptEditAreaRef = useRef<HTMLTextAreaElement>(null);

  const transcriptContainerRef = useSmartScroll([meetingTranscript, editedTranscript]);
  const translationContainerRef = useSmartScroll([fullTranslatedTranscript]);
  const chatbotContainerRef = useSmartScroll([chatbotMessages]);

  // Refs for state/props needed in stable callbacks
  const sourceLanguageRef = useRef(sourceLanguage);
  useEffect(() => { sourceLanguageRef.current = sourceLanguage; }, [sourceLanguage]);

  const targetLanguageRef = useRef(targetLanguage);
  useEffect(() => { targetLanguageRef.current = targetLanguage; }, [targetLanguage]);

  const userDataRef = useRef(userData);
  useEffect(() => { userDataRef.current = userData; }, [userData]);

  const isEditingTranscriptRef = useRef(isEditingTranscript);
  useEffect(() => { isEditingTranscriptRef.current = isEditingTranscript; }, [isEditingTranscript]);

  const meetingTranscriptRef = useRef(meetingTranscript);
  useEffect(() => { meetingTranscriptRef.current = meetingTranscript; }, [meetingTranscript]);

  const editedTranscriptRef = useRef(editedTranscript);
  useEffect(() => { editedTranscriptRef.current = editedTranscript; }, [editedTranscript]);


  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    setSourceLanguage(appSettings.sourceLanguage);
  }, [appSettings.sourceLanguage]);

  useEffect(() => {
    setTargetLanguage(appSettings.targetLanguage);
    setFullTranslatedTranscript('');
    ttsService.cancel();
  }, [appSettings.targetLanguage]);

  useEffect(() => {
    if (userData.id) {
      setSavedMeetingSessions(sessionService.listMeetingSessions());
    } else {
      setSavedMeetingSessions([]);
      setLoadedMeetingSessionId(null);
    }
  }, [userData.id]);

  const stableProcessTranslationQueue = useCallback(async () => {
    if (isProcessingTranslationQueueRef.current || translationQueueRef.current.length === 0) {
      if (translationQueueRef.current.length === 0) isProcessingTranslationQueueRef.current = false;
      return;
    }
    isProcessingTranslationQueueRef.current = true;
    setIsGeminiTranslationLoading(true);

    const chunkToProcess = translationQueueRef.current.shift();

    if (chunkToProcess) {
      let translatedChunk = '';
      const currentSourceLangCode = sourceLanguageRef.current.code;
      const currentTargetLangCode = targetLanguageRef.current.code;
      const isSameLanguage = currentSourceLangCode === currentTargetLangCode;

      if (!isSameLanguage) {
        try {
          translatedChunk = await translateText(chunkToProcess, currentSourceLangCode, currentTargetLangCode);
        } catch (e) {
          console.error("Lỗi dịch thuật:", e);
          showToast(`Lỗi dịch thuật: ${(e as Error).message}`, 'error');
        }
      }

      const textForDisplay = isSameLanguage ? chunkToProcess : (translatedChunk || `[Dịch lỗi cho: "${chunkToProcess.substring(0,20)}..."]`);
      setFullTranslatedTranscript(prev => {
        const newFullTranslation = prev ? `${prev}\n${textForDisplay}` : textForDisplay;
        const currentActiveMeetingSessionId = sessionService.getCurrentActiveMeetingSessionId();
        if (currentActiveMeetingSessionId && userDataRef.current.id) {
            sessionService.updateCurrentMeetingSessionData(currentActiveMeetingSessionId, { translatedTranscript: newFullTranslation });
        }
        return newFullTranslation;
      });
    }

    setIsGeminiTranslationLoading(false);
    isProcessingTranslationQueueRef.current = false;

    if (translationQueueRef.current.length > 0) {
      stableProcessTranslationQueue();
    }
  }, [showToast]);

  const stableHandleNewTranscriptChunk = useCallback((chunk: string) => {
    if (isEditingTranscriptRef.current) return;

    setMeetingTranscript(prev => {
      const newTranscript = prev ? `${prev}\n${chunk}` : chunk;
      const currentActiveMeetingSessionId = sessionService.getCurrentActiveMeetingSessionId();
      if (currentActiveMeetingSessionId && userDataRef.current.id) {
        sessionService.updateCurrentMeetingSessionData(currentActiveMeetingSessionId, { transcript: newTranscript });
      }
      return newTranscript;
    });

    translationQueueRef.current.push(chunk);
    if (!isProcessingTranslationQueueRef.current) {
      stableProcessTranslationQueue();
    }
  }, [stableProcessTranslationQueue]);

  const stableHandleAudioStateChange = useCallback((newState: RecordingState, details?: { errorMessage?: string; fullAudioBlob?: Blob | null }) => {
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

      const activeMeetingId = sessionService.getCurrentActiveMeetingSessionId();
      if (activeMeetingId && userDataRef.current.id && !details?.errorMessage) {
        if (isEditingTranscriptRef.current) {
          const finalTranscript = editedTranscriptRef.current ?? meetingTranscriptRef.current;
          sessionService.updateCurrentMeetingSessionData(activeMeetingId, { transcript: finalTranscript, isComplete: true });
          setIsEditingTranscript(false);
        } else {
          sessionService.updateCurrentMeetingSessionData(activeMeetingId, { isComplete: true });
        }
        const savedSession = sessionService.saveCurrentMeetingSession();
        if (savedSession) {
          setSavedMeetingSessions(sessionService.listMeetingSessions());
          showToast(`Phiên '${savedSession.name}' đã được tự động lưu.`, 'success');
        } else {
          showToast("Lưu phiên tự động thất bại.", 'error');
        }
      } else if (newState === RecordingState.Stopped && details?.errorMessage) {
         showToast("Ghi âm dừng do lỗi. Phiên không được tự động lưu.", "error");
      }
    }

    if (newState === RecordingState.Initializing) {
        setIsUiLocked(true);
        // Inlined resetForNewMeetingSession logic
        setMeetingTranscript(''); setEditedTranscript(null); setIsEditingTranscript(false);
        setFullTranslatedTranscript(''); setSummary(INITIAL_SUMMARY_CONTENT); setChatbotMessages([]);
        fullRecordingAudioBlobRef.current = null;
        if (fullRecordingAudioBlobURL.current) {
            URL.revokeObjectURL(fullRecordingAudioBlobURL.current);
            fullRecordingAudioBlobURL.current = null;
        }
        ttsService.cancel();
        translationQueueRef.current = [];
        setLoadedMeetingSessionId(null);
        setIsMicMuted(audioService.getIsMicMuted());

        if (userDataRef.current.id) {
            sessionService.startNewMeetingSession(sourceLanguageRef.current.code, targetLanguageRef.current.code);
            setLoadedMeetingSessionId(null); // Ensure this is set after potential session start
        }
    }
    if (newState === RecordingState.Recording) {
        setIsUiLocked(false);
    }
  }, [showToast]); // Only stable showToast. All other dynamic values are via refs or are setters.

  const handleMicVolumeUpdate = useCallback((volume: number, clarityHint: 'low' | 'normal') => {
      micVolumeLevelRef.current = volume;
      micClarityHintRef.current = clarityHint;
  }, []);

  const handleMicMuteStateChange = useCallback((muted: boolean) => {
    setIsMicMuted(muted);
  }, []);

  useEffect(() => {
    audioService.initAudioService({
      onStateChange: stableHandleAudioStateChange,
      onNewTranscriptChunk: stableHandleNewTranscriptChunk,
      onVolumeUpdate: handleMicVolumeUpdate,
      onMicMuteStateChange: handleMicMuteStateChange,
    });
    setIsMicMuted(audioService.getIsMicMuted());

    const stableHandleTTSError = (message: string) => {
        console.error("MainPage.tsx - TTS Error reported:", message);
        showToast(`Lỗi TTS: ${message}`, 'error');
        setIsTtsActive(false);
        setIsTtsPaused(false);
    };
    const stableHandleTTSActivityChange = (isSpeaking: boolean, isPaused: boolean) => {
        setIsTtsActive(isSpeaking);
        setIsTtsPaused(isPaused);
    };
    const stableHandleTTSLanguageSupportChange = (langCode: string, isSupported: boolean) => {
        if (langCode === targetLanguageRef.current.code) {
            setCanSpeakCurrentTargetLang(isSupported);
        }
    };

    ttsService.init(
      {
        onError: stableHandleTTSError,
        onActivityStateChange: stableHandleTTSActivityChange,
        onLanguageSupportChange: stableHandleTTSLanguageSupportChange,
      },
      targetLanguageRef.current.code
    );
    setCanSpeakCurrentTargetLang(ttsService.isLanguageSupported(targetLanguageRef.current.code));

    return () => {
      audioService.cleanupAudioService();
      ttsService.cleanup();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (fullRecordingAudioBlobURL.current) URL.revokeObjectURL(fullRecordingAudioBlobURL.current);
    };
  }, [showToast, stableHandleAudioStateChange, stableHandleNewTranscriptChunk, handleMicVolumeUpdate, handleMicMuteStateChange]);


  const currentActiveTranscript = isEditingTranscript ? (editedTranscript ?? meetingTranscript) : meetingTranscript;

  const handleStartRecording = useCallback(async () => {
    if (currentRecordingState !== RecordingState.Idle && currentRecordingState !== RecordingState.Stopped && currentRecordingState !== RecordingState.Error) return;
    if (!userDataRef.current.id) { // Use ref
        showToast("Vui lòng đăng nhập để bắt đầu ghi âm.", "error");
        return;
    }

    setElapsedTime(0);
    micErrorRef.current = false;
    setIsUiLocked(true);
    setIsMicMuted(false);

    try {
      await audioService.startAudioProcessing(sourceLanguageRef.current.code); // Use ref
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error("Lỗi trực tiếp khi bắt đầu ghi âm trong MainPage.tsx:", e);
      showToast(`Lỗi bắt đầu ghi âm: ${(e as Error).message}`, 'error');
      setCurrentRecordingState(RecordingState.Error); // Handled by stableHandleAudioStateChange
      setIsUiLocked(false);
      const activeMeetingId = sessionService.getCurrentActiveMeetingSessionId();
      if (activeMeetingId) sessionService.deleteMeetingSession(activeMeetingId);
    }
  }, [currentRecordingState, showToast]); // Removed sourceLanguage.code and userData.id

  const handleStopRecording = useCallback(() => {
    audioService.stopAudioProcessing();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  const handleToggleMicMute = useCallback(() => {
      if (currentRecordingState === RecordingState.Recording) {
        audioService.toggleMicrophoneMute();
      }
  }, [currentRecordingState]);

  const handleSummarize = useCallback(async (type: SummaryType) => {
    const transcriptToSummarize = isEditingTranscriptRef.current ? (editedTranscriptRef.current ?? meetingTranscriptRef.current) : meetingTranscriptRef.current;
    if (!transcriptToSummarize.trim() || isGeminiSummaryLoading) return;
    setIsGeminiSummaryLoading(type);
    try {
      const summaryResult = await summarizeText(transcriptToSummarize, type, sourceLanguageRef.current.code);
      setSummary(prev => {
        const newSummary = { ...prev, [type]: summaryResult };
        const activeMeetingId = loadedMeetingSessionId || sessionService.getCurrentActiveMeetingSessionId();
        if (activeMeetingId && userDataRef.current.id) {
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
  }, [isGeminiSummaryLoading, loadedMeetingSessionId, showToast]); // Removed state/prop direct dependencies

  const handleChatbotSendMessage = useCallback(async (message: string) => {
    const newUserMessage: ChatMessage = { id: Date.now().toString(), text: message, sender: 'user' };
    setChatbotMessages(prev => [...prev, newUserMessage]);
    
    const transcriptForChat = isEditingTranscriptRef.current ? (editedTranscriptRef.current ?? meetingTranscriptRef.current) : meetingTranscriptRef.current;

    if (!transcriptForChat.trim()) {
       const noTranscriptBotMessage: ChatMessage = { id: Date.now().toString() + '_bot', text: "Xin lỗi, chưa có nội dung phiên âm để tôi có thể trả lời.", sender: 'bot' };
       setChatbotMessages(prev => [...prev, noTranscriptBotMessage]);
       return;
    }
    setIsGeminiChatbotLoading(true);
    try {
      const botResponse = await answerFromTranscript(transcriptForChat, message, sourceLanguageRef.current.name);
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
  }, [showToast]); // Removed state/prop direct dependencies

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
    const transcriptToDownload = isEditingTranscriptRef.current ? (editedTranscriptRef.current ?? meetingTranscriptRef.current) : meetingTranscriptRef.current;
    if (!transcriptToDownload.trim()) {
      showToast("Không có nội dung phiên âm để tải.", 'info');
      return;
    }
    downloadFile(transcriptToDownload, `transcript_${sourceLanguageRef.current.code}.txt`, 'text/plain;charset=utf-8');
  }, [downloadFile, showToast]);

  const handleDownloadTranslatedTranscript = useCallback(() => {
    if (!fullTranslatedTranscript.trim()) { // fullTranslatedTranscript is state, use directly
      showToast("Không có nội dung dịch để tải.", 'info');
      return;
    }
    downloadFile(fullTranslatedTranscript, `translation_${targetLanguageRef.current.code}.txt`, 'text/plain;charset=utf-8');
  }, [fullTranslatedTranscript, downloadFile, showToast]); // Added targetLanguageRef

  const handleDownloadSummary = useCallback(() => {
    const summaryContent = // summary is state, use directly
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


  const handleSpeakAllProcessedText = useCallback(() => {
    const transcriptForTTS = isEditingTranscriptRef.current ? (editedTranscriptRef.current ?? meetingTranscriptRef.current) : meetingTranscriptRef.current;
    const textToSpeak = sourceLanguageRef.current.code === targetLanguageRef.current.code ? transcriptForTTS : fullTranslatedTranscript; // fullTranslatedTranscript is state
    if (textToSpeak.trim() && canSpeakCurrentTargetLang && !isTtsActive) { // canSpeakCurrentTargetLang, isTtsActive are state
      ttsService.speak(textToSpeak, targetLanguageRef.current.code, true);
    }
  }, [fullTranslatedTranscript, canSpeakCurrentTargetLang, isTtsActive]); // Added dependencies

  const handleToggleEditTranscript = () => {
    setIsEditingTranscript(prev => {
        if (!prev) {
            setEditedTranscript(meetingTranscriptRef.current); // Use ref for current value
            setTimeout(() => transcriptEditAreaRef.current?.focus(), 0);
        }
        return !prev;
    });
  };

  const handleSaveEditedTranscript = useCallback(() => {
    const finalTranscript = editedTranscriptRef.current ?? meetingTranscriptRef.current;
    setMeetingTranscript(finalTranscript);
    setIsEditingTranscript(false);

    const activeMeetingId = loadedMeetingSessionId || sessionService.getCurrentActiveMeetingSessionId();
    if (activeMeetingId && userDataRef.current.id) {
        sessionService.updateCurrentMeetingSessionData(activeMeetingId, { transcript: finalTranscript });
    }

    showToast("Phiên âm đã được cập nhật. Dịch và tóm tắt sẽ được làm mới.", 'success');
    translationQueueRef.current = finalTranscript.split('\n').filter(line => line.trim() !== '');
    setFullTranslatedTranscript('');
    if (!isProcessingTranslationQueueRef.current) {
        stableProcessTranslationQueue();
    }
    setSummary(INITIAL_SUMMARY_CONTENT);
  }, [stableProcessTranslationQueue, loadedMeetingSessionId, showToast]); // Added dependencies

  const handleLoadMeetingSession = (sessionId: string) => {
    if (!userDataRef.current.id) return; // Use ref
    const session = sessionService.getMeetingSession(sessionId);
    if (session) {
        // Inlined resetForNewMeetingSession logic for loaded session
        setMeetingTranscript(session.transcript || '');
        setEditedTranscript(session.transcript || ''); // Initialize edited with loaded
        setIsEditingTranscript(false);
        setFullTranslatedTranscript(session.translatedTranscript || '');
        setSummary(session.summary || INITIAL_SUMMARY_CONTENT);
        setChatbotMessages([]);
        if (session.audioBlobUrl) {
            fullRecordingAudioBlobURL.current = session.audioBlobUrl;
        } else {
            fullRecordingAudioBlobURL.current = null;
        }
        fullRecordingAudioBlobRef.current = null; // Don't load actual blob, just URL
        ttsService.cancel();
        translationQueueRef.current = [];
        setLoadedMeetingSessionId(session.id);
        setIsMicMuted(audioService.getIsMicMuted()); // Reset based on current hardware state

        onSettingsChange({ // This updates App.tsx state, which flows back as props
            sourceLanguage: SUPPORTED_LANGUAGES.find(l => l.code === session.sourceLang) || sourceLanguageRef.current,
            targetLanguage: SUPPORTED_LANGUAGES.find(l => l.code === session.targetLang) || targetLanguageRef.current,
        });
        
        setCurrentRecordingState(RecordingState.Stopped); // Indicate it's a loaded, non-active session
        setElapsedTime(0);
        showToast(`Đã tải phiên: ${session.name}`, 'success');
    } else {
        showToast("Không thể tải phiên đã chọn.", 'error');
    }
  };

  const handleDeleteMeetingSession = (sessionId: string) => {
    if (!userDataRef.current.id) return; // Use ref
    if (confirm("Bạn có chắc chắn muốn xóa phiên này? Hành động này không thể hoàn tác.")) {
        sessionService.deleteMeetingSession(sessionId);
        setSavedMeetingSessions(sessionService.listMeetingSessions());
        if (loadedMeetingSessionId === sessionId) {
            // Inlined resetForNewMeetingSession logic for active session deletion
            setMeetingTranscript(''); setEditedTranscript(null); setIsEditingTranscript(false);
            setFullTranslatedTranscript(''); setSummary(INITIAL_SUMMARY_CONTENT); setChatbotMessages([]);
            fullRecordingAudioBlobRef.current = null;
            if (fullRecordingAudioBlobURL.current) { URL.revokeObjectURL(fullRecordingAudioBlobURL.current); fullRecordingAudioBlobURL.current = null; }
            ttsService.cancel(); translationQueueRef.current = []; setLoadedMeetingSessionId(null);
            setIsMicMuted(audioService.getIsMicMuted());
            setCurrentRecordingState(RecordingState.Idle); // Reset state
            setElapsedTime(0);
        }
        showToast("Đã xóa phiên.", 'success');
    }
  };

  const isRecordingInProgress = [RecordingState.Initializing, RecordingState.Recording, RecordingState.Stopping].includes(currentRecordingState);

  const handleSourceLangChange = (lang: LanguageOption) => {
    if (isRecordingInProgress) { showToast("Không thể đổi ngôn ngữ khi đang ghi âm.", "error"); return; }
    onSettingsChange({ sourceLanguage: lang }); // This will update appSettings prop, then sourceLanguage state via useEffect
    const activeMeetingId = sessionService.getCurrentActiveMeetingSessionId();
    if (activeMeetingId) sessionService.updateCurrentMeetingSessionData(activeMeetingId, { sourceLang: lang.code });
  };

  const handleTargetLangChange = (lang: LanguageOption) => {
    if (isRecordingInProgress) { showToast("Không thể đổi ngôn ngữ khi đang ghi âm.", "error"); return; }
    onSettingsChange({ targetLanguage: lang }); // This will update appSettings prop, then targetLanguage state via useEffect
    const activeMeetingId = sessionService.getCurrentActiveMeetingSessionId();
    if (activeMeetingId) sessionService.updateCurrentMeetingSessionData(activeMeetingId, { targetLang: lang.code });
  };

  const transcriptLoadingMessage = currentRecordingState === RecordingState.Initializing ? (
    <div className="text-center text-slate-400">
      <LoadingSpinner /> <p className="mt-2">Đang khởi tạo...</p>
    </div>
  ) : currentRecordingState === RecordingState.Recording && !currentActiveTranscript && !loadedMeetingSessionId ? (
    <div className="text-center text-slate-400">
      <LoadingSpinner /> <p className="mt-2">Chờ phiên âm...</p>
    </div>
  ) : !currentActiveTranscript && !loadedMeetingSessionId ? (
    <p className="text-slate-400 italic text-center">Bắt đầu ghi âm hoặc tải phiên.</p>
  ) : null;

  const translationLoadingMessage = isGeminiTranslationLoading && !fullTranslatedTranscript ? (
     <div className="text-center text-slate-400">
      <LoadingSpinner /> <p className="mt-2">Đang dịch...</p>
    </div>
  ) : !fullTranslatedTranscript && sourceLanguage.code !== targetLanguage.code && currentActiveTranscript && !loadedMeetingSessionId ? (
      <p className="text-slate-400 italic text-center">Đang chờ dịch...</p>
  ) : !fullTranslatedTranscript && currentActiveTranscript && sourceLanguage.code !== targetLanguage.code ? (
      <p className="text-slate-400 italic text-center">Bản dịch cần tạo lại.</p>
  ) : !fullTranslatedTranscript && sourceLanguage.code === targetLanguage.code ? null
    : !currentActiveTranscript ? (
      <p className="text-slate-400 italic text-center">Chưa có nội dung dịch.</p>
    ) : null;

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const ttsPrimaryTextAvailable = sourceLanguage.code === targetLanguage.code ? currentActiveTranscript.trim() : fullTranslatedTranscript.trim();
  const theme = appSettings.theme;
  const cardBg = theme === 'dark' ? 'bg-slate-800' : 'bg-white';
  const cardTextColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-800';
  const headingColor = theme === 'dark' ? 'text-sky-400' : 'text-sky-600';
  const actionButton = `font-medium py-2 px-3 rounded-lg shadow-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm flex items-center justify-center`;

  const transcriptEditButtons = (!isRecordingInProgress || loadedMeetingSessionId) && currentActiveTranscript.trim() ? (
    <div className="flex items-center space-x-2">
      {isEditingTranscript ? (
        <button
          onClick={handleSaveEditedTranscript}
          className={`${actionButton} bg-green-500 hover:bg-green-600 text-white focus:ring-green-400 focus:ring-offset-${theme === 'dark' ? 'slate-800' : 'white'}`}
          title="Lưu thay đổi phiên âm"
        >
          <SaveIcon className="w-4 h-4 mr-1 sm:mr-1.5" /> Lưu
        </button>
      ) : null}
      <button
        onClick={handleToggleEditTranscript}
        className={`${actionButton} ${isEditingTranscript ? 'bg-yellow-500 hover:bg-yellow-600' : (theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300')} ${isEditingTranscript ? 'text-white' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-700')} focus:ring-yellow-400 focus:ring-offset-${theme === 'dark' ? 'slate-800' : 'white'}`}
        title={isEditingTranscript ? "Hủy chỉnh sửa" : "Chỉnh sửa phiên âm"}
      >
        <EditIcon className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  const translationTTSButtons = ttsPrimaryTextAvailable ? (
    <div className="flex items-center space-x-2">
      {canSpeakCurrentTargetLang && (
        <button
          onClick={handleSpeakAllProcessedText}
          disabled={!ttsPrimaryTextAvailable || isTtsActive || isEditingTranscript}
          className={`${actionButton} bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400 focus:ring-offset-${theme === 'dark' ? 'slate-800' : 'white'}`}
          title="Phát toàn bộ bản dịch/phiên âm"
        >
          <VolumeUpIcon className="w-4 h-4" />
        </button>
      )}
      {isTtsActive && canSpeakCurrentTargetLang && (
        <>
          <button onClick={isTtsPaused ? ttsService.resume : ttsService.pause} className={`${actionButton} ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'} focus:ring-slate-400 focus:ring-offset-${theme === 'dark' ? 'slate-800' : 'white'}`} title={isTtsPaused ? "Tiếp tục" : "Tạm dừng"}>
            {isTtsPaused ? <PlayIcon className="w-4 h-4" /> : <MediaPauseIcon className="w-4 h-4" />}
          </button>
          <button onClick={ttsService.cancel} className={`${actionButton} bg-red-500 hover:bg-red-600 text-white focus:ring-red-400 focus:ring-offset-${theme === 'dark' ? 'slate-800' : 'white'}`} title="Dừng hẳn">
            <StopIcon className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  ) : null;


  return (
    <div className={`min-h-screen flex flex-col items-center p-2 sm:p-4 md:p-6 ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-sky-50 text-slate-900'}`}>
      <div className={`w-full max-w-screen-xl flex justify-end items-center mb-3 md:mb-4 p-2 sm:p-3 rounded-xl ${cardBg} shadow-md`}>
        <div className="flex items-center space-x-2 sm:space-x-3">
            {userData.id && (
                <div className={`flex items-center text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg shadow-inner ${theme === 'dark' ? 'bg-slate-700 text-sky-400' : 'bg-sky-100 text-sky-700 border border-sky-200'}`}>
                    <UserCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2"/>
                    <span>Chào, {userData.name}!</span>
                </div>
            )}
            <button
                onClick={() => navigateTo('settings')}
                className={`p-2 rounded-lg shadow-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 focus:ring-slate-500 focus:ring-offset-slate-800' : 'bg-white hover:bg-slate-100 text-slate-700 focus:ring-sky-500 focus:ring-offset-white border border-slate-200'}`}
                title="Cài đặt" aria-label="Cài đặt"
            >
                <SettingsIcon className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className={`w-full max-w-screen-xl p-3 sm:p-4 mb-4 md:mb-6 rounded-xl shadow-lg ${cardBg} flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4`}>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <LanguageSelector label="Ngôn ngữ gốc:" selectedLanguage={sourceLanguage} languages={SUPPORTED_LANGUAGES} onChange={handleSourceLangChange} isDisabled={isRecordingInProgress} theme={theme} />
          <LanguageSelector label="Dịch sang:" selectedLanguage={targetLanguage} languages={SUPPORTED_LANGUAGES} onChange={handleTargetLangChange} isDisabled={isRecordingInProgress} theme={theme} />
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className={`text-xl sm:text-2xl font-mono tracking-wider px-2 sm:px-3 py-1 rounded ${theme === 'dark' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
            {formatTime(elapsedTime)}
            {currentRecordingState === RecordingState.Recording && <RecordingStatusIcon className="w-3 h-3 inline-block ml-1.5 text-red-500 animate-pulse" />}
          </div>
          {(() => {
              const commonButtonClasses = `${actionButton} focus:ring-offset-${theme === 'dark' ? cardBg.split(' ')[0].substring(3) : 'white'}`;
              if (currentRecordingState === RecordingState.Initializing) {
                  return ( <button disabled className={`${commonButtonClasses} bg-green-500 text-white focus:ring-green-400`} aria-label="Đang khởi tạo..."> <LoadingSpinner size="sm" color="text-white" /> </button> );
              }
              if (currentRecordingState === RecordingState.Recording) {
                  return ( <button onClick={handleStopRecording} className={`${commonButtonClasses} bg-red-500 hover:bg-red-600 text-white focus:ring-red-400`} aria-label="Dừng ghi âm"> <StopIcon className="w-5 h-5"/> </button> );
              }
              if (currentRecordingState === RecordingState.Stopping) {
                  return ( <button disabled className={`${commonButtonClasses} bg-red-500 text-white focus:ring-red-400`} aria-label="Đang dừng..."> <LoadingSpinner size="sm" color="text-white"/> </button> );
              }
              return ( <button onClick={handleStartRecording} className={`${commonButtonClasses} bg-green-500 hover:bg-green-600 text-white focus:ring-green-400`} aria-label="Bắt đầu ghi âm"> <PlayIcon className="w-5 h-5"/> </button> );
          })()}
           <button onClick={handleToggleMicMute} disabled={currentRecordingState !== RecordingState.Recording} className={`${actionButton} ${isMicMuted ? (theme === 'dark' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600') : (theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500' : 'bg-slate-200 hover:bg-slate-300')} text-white focus:ring-yellow-400 focus:ring-offset-${theme === 'dark' ? cardBg.split(' ')[0].substring(3) : 'white'}`} aria-label={isMicMuted ? "Bật tiếng micro" : "Tắt tiếng micro"}>
            {isMicMuted ? <MicOffIcon className="w-5 h-5"/> : <MicIcon className="w-5 h-5"/>}
          </button>
        </div>
      </div>
       <div className={`w-full max-w-screen-xl mb-4 md:mb-6`}>
         <MicrophoneVolumeIndicator
              volumeLevel={micVolumeLevelRef.current}
              isActive={currentRecordingState === RecordingState.Recording}
              isMuted={isMicMuted}
              clarityHint={micClarityHintRef.current}
              theme={theme}
          />
        </div>

      <main className="w-full max-w-screen-xl grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6">
        <section className="md:col-span-3 space-y-4 md:space-y-6 flex flex-col">
          <TranscriptArea
            title={`Phiên âm (${sourceLanguage.name})`}
            content={isEditingTranscript ? (editedTranscript ?? '') : (currentActiveTranscript || transcriptLoadingMessage)}
            isEditing={isEditingTranscript}
            onEdit={setEditedTranscript} 
            textareaRef={transcriptEditAreaRef}
            theme={theme}
            containerRef={transcriptContainerRef}
            headerActions={transcriptEditButtons}
          />
          <TranscriptArea
            title={sourceLanguage.code !== targetLanguage.code ? `Bản dịch (${targetLanguage.name})` : `Bản dịch (Sao chép từ Phiên âm)`}
            content={fullTranslatedTranscript || translationLoadingMessage}
            theme={theme}
            containerRef={translationContainerRef}
            headerActions={translationTTSButtons}
          />
        </section>

        <section className="md:col-span-2 space-y-4 md:space-y-6 flex flex-col">
          <div className={`p-3 sm:p-4 rounded-xl shadow-xl ${cardBg} ${cardTextColor} flex-grow flex flex-col`}>
            <div className="flex mb-3 sm:mb-4">
              {([
                { id: 'summary', label: 'Tóm Tắt', icon: LightbulbIcon },
                { id: 'actionItems', label: 'Mục Hành Động', icon: ListChecksIcon },
                { id: 'qa', label: 'Hỏi & Đáp', icon: ChatBubbleIcon }
              ] as {id: ActionTabType, label: string, icon: React.FC<{className?: string}>}[]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveActionTab(tab.id)}
                  className={`flex-1 sm:flex-none sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-150 flex items-center justify-center space-x-1 sm:space-x-1.5
                    ${activeActionTab === tab.id
                      ? `${theme === 'dark' ? 'text-sky-400 border-sky-400' : 'text-sky-600 border-sky-600'}`
                      : `border-transparent ${theme === 'dark' ? 'text-slate-400 hover:text-sky-400 hover:border-sky-400' : 'text-slate-500 hover:text-sky-600 hover:border-sky-600'}`
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="flex-1"> 
              {activeActionTab === 'summary' && ( <SummarySection summary={summary} onSummarize={() => handleSummarize(SummaryType.KeyPoints)} isLoading={isGeminiSummaryLoading === SummaryType.KeyPoints} isProcessing={!currentActiveTranscript.trim()} theme={theme} summaryTypeToShow={SummaryType.KeyPoints} /> )}
              {activeActionTab === 'actionItems' && ( <SummarySection summary={summary} onSummarize={() => handleSummarize(SummaryType.ActionItems)} isLoading={isGeminiSummaryLoading === SummaryType.ActionItems} isProcessing={!currentActiveTranscript.trim()} theme={theme} summaryTypeToShow={SummaryType.ActionItems} /> )}
              {activeActionTab === 'qa' && ( <Chatbot chatMessages={chatbotMessages} onSendMessage={handleChatbotSendMessage} isChatbotLoading={isGeminiChatbotLoading || !currentActiveTranscript.trim()} theme={theme} containerRef={chatbotContainerRef} /> )}
            </div>
          </div>

          <div className={`p-3 sm:p-4 rounded-xl shadow-xl ${cardBg}`}>
            <h3 className={`text-base sm:text-lg font-semibold mb-3 ${headingColor} flex items-center`}> <DownloadIcon className="w-5 h-5 mr-2" /> Tải xuống </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <button onClick={handleDownloadTranscript} className={`${actionButton} ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} title="Tải phiên âm">Phiên âm</button>
              <button onClick={handleDownloadTranslatedTranscript} disabled={sourceLanguage.code === targetLanguage.code} className={`${actionButton} ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} title="Tải bản dịch">Bản dịch</button>
              <button onClick={handleDownloadSummary} className={`${actionButton} ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} title="Tải tóm tắt">Tóm tắt</button>
              <button onClick={handleDownloadFullAudio} disabled={!(loadedMeetingSessionId || fullRecordingAudioBlobURL.current)} className={`${actionButton} ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`} title="Tải file âm thanh gốc">Âm thanh</button>
              {isClient && (currentActiveTranscript.trim() || fullTranslatedTranscript.trim()) && (
                  <PDFDownloadLink
                    document={ <MeetingReportPdf transcript={currentActiveTranscript} translation={fullTranslatedTranscript} summaryContent={summary} sourceLangName={sourceLanguage.name} targetLangName={targetLanguage.name} /> }
                    fileName={`meeting_report_${new Date().toISOString().split('T')[0]}.pdf`}
                    onClick={() => { if (!isGeneratingPdf) setIsGeneratingPdf(true); }}
                    className={`${actionButton} col-span-2 sm:col-span-1 bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-400 focus:ring-offset-${theme === 'dark' ? cardBg.split(' ')[0].substring(3) : 'white'}`}
                    aria-label="Tải báo cáo PDF"
                  >
                    {({ loading: internalPdfLoading, error: pdfError }) => {
                        React.useEffect(() => {
                            if (isGeneratingPdf && !internalPdfLoading) setIsGeneratingPdf(false);
                            if (pdfError) { console.error("PDF Generation Error:", pdfError); showToast('Lỗi tạo PDF: ' + pdfError.message, 'error'); if (isGeneratingPdf) setIsGeneratingPdf(false); }
                        }, [internalPdfLoading, pdfError, isGeneratingPdf, showToast]);
                        return (isGeneratingPdf || internalPdfLoading) ? 'Đang tạo PDF...' : 'Tải PDF';
                      }
                    }
                  </PDFDownloadLink>
              )}
            </div>
          </div>

            {userData.id && (
            <div className={`p-3 sm:p-4 rounded-xl shadow-xl ${cardBg} ${cardTextColor}`}>
                <h3 className={`text-base sm:text-lg font-semibold mb-3 ${headingColor} flex items-center`}> <ArchiveIcon className="w-5 h-5 mr-2" /> Phiên đã lưu </h3>
                {savedMeetingSessions.length > 0 ? (
                <ul className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700 pr-1">
                    {savedMeetingSessions.map(session => (
                    <li key={session.id} className={`p-2.5 rounded-lg flex justify-between items-center ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}>
                        <span className="truncate text-xs sm:text-sm" title={session.name}>{session.name} - <span className="text-slate-400 text-xs">{new Date(session.createdAt).toLocaleDateString()}</span></span>
                        <div className="flex space-x-1.5">
                        <button onClick={() => handleLoadMeetingSession(session.id)} className={`p-1.5 rounded ${theme === 'dark' ? 'hover:bg-slate-500' : 'hover:bg-slate-300'}`} title="Tải phiên"><LoadIcon className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteMeetingSession(session.id)} className={`p-1.5 rounded ${theme === 'dark' ? 'hover:bg-red-700 text-red-400 hover:text-red-300' : 'hover:bg-red-200 text-red-500 hover:text-red-700'}`} title="Xóa phiên"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </li>
                    ))}
                </ul>
                ) : ( <p className={`text-xs sm:text-sm text-center italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Chưa có phiên nào được lưu.</p> )}
            </div>
            )}
        </section>
      </main>
    </div>
  );
};
