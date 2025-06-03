
import { sttService } from './sttService'; // Use the new STT service
import { RecordingState } from '../types';

const AUDIO_CHUNK_TIMESLICE_MS = 5000; // 5 seconds per chunk
const LOW_VOLUME_THRESHOLD = 15; // Percentage for low volume hint
const LOW_VOLUME_CHECKS_TRIGGER = 30; // Number of consecutive low volume checks to trigger hint
const RECENT_VOLUME_HISTORY_LENGTH = 20; // Number of volume samples for averaging

// --- Service State ---
let internalState: RecordingState = RecordingState.Idle;
let serviceCallbacks: ServiceCallbacks | null = null;
let currentSourceLanguageCode: string = 'en'; // Default, will be updated by startAudioProcessing
let isMicMutedByUser: boolean = false;

// Audio acquisition and mixing
let userMicStream: MediaStream | null = null;
let displayAudioStream: MediaStream | null = null; // Can be from tab or screen
let mixedAudioStream: MediaStream | null = null;
let audioContextForMixing: AudioContext | null = null;
let originalMicTracks: MediaStreamTrack[] = [];
let originalDisplayTracksAndVideo: MediaStreamTrack[] = []; // Includes video tracks from getDisplayMedia

// Volume visualization (uses direct userMicStream)
let visualizerAudioContext: AudioContext | null = null;
let visualizerAnalyserNode: AnalyserNode | null = null;
let visualizerSourceNode: MediaStreamAudioSourceNode | null = null;
let visualizerDataArray: Uint8Array | null = null;
let visualizerAnimationFrameId: number | null = null;
let lowVolumeConsecutiveChecks = 0;
const recentVolumeLevels: number[] = [];

// Recording segments (uses mixedAudioStream)
let segmentRecorder: MediaRecorder | null = null;
let segmentProcessingTimeoutId: number | null = null;
let currentSegmentMimeType: string = '';
const allRecordedBlobs: Blob[] = [];

const logAudio = (message: string, ...args: any[]) => {
  console.log(`[AudioService] ${message}`, ...args);
};

export interface ServiceCallbacks {
  onStateChange: (newState: RecordingState, details?: { errorMessage?: string; fullAudioBlob?: Blob | null }) => void;
  onNewTranscriptChunk: (transcript: string) => void;
  onVolumeUpdate: (volume: number, clarityHint: 'low' | 'normal') => void;
  onMicMuteStateChange?: (isMuted: boolean) => void;
}

const updateState = (newState: RecordingState, details?: { errorMessage?: string; fullAudioBlob?: Blob | null }) => {
  internalState = newState;
  serviceCallbacks?.onStateChange(newState, details);
};

const cleanupAudioVisualizer = () => {
  if (visualizerAnimationFrameId) cancelAnimationFrame(visualizerAnimationFrameId);
  visualizerAnimationFrameId = null;
  visualizerSourceNode?.disconnect();
  visualizerSourceNode = null;
  visualizerAnalyserNode = null; 
  visualizerDataArray = null;
  serviceCallbacks?.onVolumeUpdate(0, 'normal');
  if (visualizerAudioContext && visualizerAudioContext.state !== 'closed') {
    visualizerAudioContext.close().catch(e => logAudio("Error closing visualizer AudioContext:", e));
  }
  visualizerAudioContext = null;
  recentVolumeLevels.length = 0;
  lowVolumeConsecutiveChecks = 0;
};

const setupAudioVisualizer = async (micStream: MediaStream) => {
  if (visualizerAudioContext && visualizerAudioContext.state !== 'closed' || micStream.getAudioTracks().length === 0) {
    return;
  }
  try {
    visualizerAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    await visualizerAudioContext.resume();
    visualizerAnalyserNode = visualizerAudioContext.createAnalyser();
    visualizerAnalyserNode.fftSize = 256; 
    visualizerSourceNode = visualizerAudioContext.createMediaStreamSource(micStream);
    visualizerSourceNode.connect(visualizerAnalyserNode);
    visualizerDataArray = new Uint8Array(visualizerAnalyserNode.frequencyBinCount);

    const draw = () => {
      if (!visualizerAnalyserNode || !visualizerDataArray || internalState !== RecordingState.Recording) {
        if (visualizerAnimationFrameId) cancelAnimationFrame(visualizerAnimationFrameId);
        visualizerAnimationFrameId = null;
        return;
      }
      visualizerAnalyserNode.getByteFrequencyData(visualizerDataArray);
      let sum = 0;
      // If mic is muted, dataArray will be all zeros (or close to it), so volume will be 0.
      for (const amplitude of visualizerDataArray) sum += amplitude * amplitude;
      const normalizedVolume = Math.min(100, (Math.sqrt(sum / visualizerDataArray.length) / 128) * 100 * 1.7); 

      recentVolumeLevels.push(normalizedVolume);
      if (recentVolumeLevels.length > RECENT_VOLUME_HISTORY_LENGTH) recentVolumeLevels.shift();
      
      let clarityHint: 'low' | 'normal' = 'normal';
      if (!isMicMutedByUser && recentVolumeLevels.length >= RECENT_VOLUME_HISTORY_LENGTH * 0.75) { // Only show hint if not muted
        const avgRecentVolume = recentVolumeLevels.reduce((s, v) => s + v, 0) / recentVolumeLevels.length;
        if (avgRecentVolume < LOW_VOLUME_THRESHOLD) {
          lowVolumeConsecutiveChecks++;
          if (lowVolumeConsecutiveChecks >= LOW_VOLUME_CHECKS_TRIGGER) clarityHint = 'low';
        } else {
          lowVolumeConsecutiveChecks = 0;
        }
      }
      // Report 0 volume if muted, otherwise actual volume.
      serviceCallbacks?.onVolumeUpdate(isMicMutedByUser ? 0 : normalizedVolume, clarityHint);
      visualizerAnimationFrameId = requestAnimationFrame(draw);
    };
    visualizerAnimationFrameId = requestAnimationFrame(draw);
  } catch (err) {
    logAudio('Error setting up audio visualizer:', err);
    updateState(RecordingState.Error, { errorMessage: `Lỗi khởi tạo bộ trực quan âm lượng: ${(err as Error).message}` });
    cleanupAudioVisualizer();
  }
};

const determineSegmentMimeType = () => {
    const preferredTypes = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'];
    for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
            logAudio("Determined segment MIME type:", type);
            return type;
        }
    }
    logAudio("Warning: No preferred MIME type supported by MediaRecorder. Returning empty string.");
    return ''; 
};

const acquireAudioStreams = async (): Promise<boolean> => {
  try {
    userMicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    originalMicTracks = userMicStream.getAudioTracks();

    if (originalMicTracks.length === 0) {
      throw new Error("Không có rãnh âm thanh nào từ micro.");
    }
    // Ensure mic is initially unmuted (tracks enabled)
    originalMicTracks.forEach(track => track.enabled = true);


    try {
        displayAudioStream = await navigator.mediaDevices.getDisplayMedia({
            video: true, 
            audio: { suppressLocalAudioPlayback: false } as MediaTrackConstraints, 
        });
    } catch (e) {
        logAudio("getDisplayMedia with preferred tab audio failed or was cancelled. Trying screen with audio.", e);
         displayAudioStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true, 
        });
    }
    
    originalDisplayTracksAndVideo = displayAudioStream.getTracks(); 
    const displayAudioTracksOnly = displayAudioStream.getAudioTracks();


    if (displayAudioTracksOnly.length > 0) {
      audioContextForMixing = new (window.AudioContext || (window as any).webkitAudioContext)();
      await audioContextForMixing.resume();
      const micSource = audioContextForMixing.createMediaStreamSource(userMicStream);
      const displaySource = audioContextForMixing.createMediaStreamSource(new MediaStream(displayAudioTracksOnly));
      const destinationNode = audioContextForMixing.createMediaStreamDestination();
      micSource.connect(destinationNode);
      displaySource.connect(destinationNode);
      mixedAudioStream = destinationNode.stream;
      logAudio("Mixed audio stream created from mic and display audio.");
    } else {
      logAudio("Không có âm thanh từ chia sẻ màn hình/tab. Chỉ ghi âm từ micro.");
      mixedAudioStream = userMicStream; 
    }
    return true;
  } catch (err) {
    const error = err as Error;
    logAudio("Error acquiring audio streams:", error);
    let userMessage = `Lỗi khi truy cập thiết bị âm thanh: ${error.message}.`;
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        userMessage = "Quyền truy cập micro hoặc chia sẻ màn hình/tab đã bị từ chối. Vui lòng cấp quyền và thử lại.";
    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        userMessage = "Không tìm thấy micro. Vui lòng kiểm tra thiết bị của bạn.";
    }
    updateState(RecordingState.Error, { errorMessage: userMessage });
    return false;
  }
};

const processRecordedSegment = async (audioBlob: Blob) => {
  if (!serviceCallbacks) return; 
  // If isMicMutedByUser is true, the audioBlob will contain only system audio (if any) or silence from the mic component of mixedAudioStream.
  // Transcription will proceed on this content.
  try {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64AudioData = (reader.result as string).split(',')[1];
      const mimeTypeForTranscription = audioBlob.type || currentSegmentMimeType || 'audio/webm';
      try {
        // Use sttService for transcription
        const transcriptChunk = await sttService.transcribeAudio(base64AudioData, mimeTypeForTranscription, currentSourceLanguageCode);
        if (transcriptChunk.trim()) {
          serviceCallbacks.onNewTranscriptChunk(transcriptChunk);
        }
      } catch (transcriptionError) {
        logAudio("Lỗi phiên âm đoạn âm thanh:", transcriptionError);
      }
    };
    reader.onerror = () => {
        logAudio("Lỗi đọc FileBlob cho phiên âm.");
    };
  } catch (error) {
    logAudio("Lỗi chuẩn bị dữ liệu cho phiên âm:", error);
  }
};

const startNextSegmentRecording = () => {
  if (internalState !== RecordingState.Recording) {
    if (internalState === RecordingState.Stopping) { 
        performFinalCleanup();
    }
    return;
  }

  if (!mixedAudioStream || mixedAudioStream.getAudioTracks().length === 0 || !mixedAudioStream.active) {
    updateState(RecordingState.Error, { errorMessage: "Luồng âm thanh để ghi không hợp lệ hoặc không hoạt động." });
    performFinalCleanup();
    return;
  }

  const segmentChunks: Blob[] = [];
  try {
    segmentRecorder = new MediaRecorder(mixedAudioStream, { mimeType: currentSegmentMimeType || undefined });
  } catch (e) {
    logAudio("Lỗi tạo MediaRecorder:", e);
    updateState(RecordingState.Error, { errorMessage: `Không thể tạo MediaRecorder: ${(e as Error).message}` });
    performFinalCleanup();
    return;
  }

  segmentRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) segmentChunks.push(event.data);
  };

  segmentRecorder.onstop = async () => {
    const recorderThatStopped = segmentRecorder; 
    segmentRecorder = null; 

    if (segmentChunks.length > 0) {
      const segmentBlob = new Blob(segmentChunks, { type: recorderThatStopped?.mimeType || currentSegmentMimeType });
      logAudio(`Collected segment blob. Size: ${segmentBlob.size}, Type: ${segmentBlob.type}. Pushing to allRecordedBlobs.`);
      allRecordedBlobs.push(segmentBlob);
      await processRecordedSegment(segmentBlob); // Always process, content depends on mute state
    } else {
      logAudio("Segment recorded but segmentChunks is empty. No blob to process or add.");
    }
    if (internalState === RecordingState.Recording) {
      startNextSegmentRecording(); 
    } else if (internalState === RecordingState.Stopping) {
      performFinalCleanup(); 
    }
  };

  segmentRecorder.onerror = (event) => {
    const error = (event as any).error || new Error("Lỗi MediaRecorder của phân đoạn không xác định");
    logAudio("MediaRecorder segment error:", error);
    updateState(RecordingState.Error, { errorMessage: `Lỗi MediaRecorder: ${error.message}` });
    performFinalCleanup();
  };

  try {
    segmentRecorder.start();
    if (segmentProcessingTimeoutId) clearTimeout(segmentProcessingTimeoutId);
    segmentProcessingTimeoutId = window.setTimeout(() => {
      if (segmentRecorder && segmentRecorder.state === 'recording') {
        segmentRecorder.stop();
      }
    }, AUDIO_CHUNK_TIMESLICE_MS);
  } catch (err) {
    logAudio("Lỗi khi bắt đầu MediaRecorder:", err);
    updateState(RecordingState.Error, { errorMessage: `Lỗi khởi động MediaRecorder: ${(err as Error).message}` });
    performFinalCleanup();
  }
};

const performFinalCleanup = () => {
  const previousState = internalState;
  updateState(RecordingState.Idle); 

  if (segmentProcessingTimeoutId) clearTimeout(segmentProcessingTimeoutId);
  segmentProcessingTimeoutId = null;

  if (segmentRecorder && segmentRecorder.state !== "inactive") {
    segmentRecorder.onstop = null; 
    segmentRecorder.onerror = null;
    try { segmentRecorder.stop(); } catch(e) { /* ignore */ }
  }
  segmentRecorder = null;

  cleanupAudioVisualizer();

  originalMicTracks.forEach(track => track.stop());
  originalDisplayTracksAndVideo.forEach(track => track.stop());
  originalMicTracks = [];
  originalDisplayTracksAndVideo = [];

  userMicStream = null;
  displayAudioStream = null;
  mixedAudioStream = null;

  if (audioContextForMixing && audioContextForMixing.state !== 'closed') {
    audioContextForMixing.close().catch(e => logAudio("Lỗi đóng AudioContext trộn:", e));
  }
  audioContextForMixing = null;

  let finalBlob: Blob | null = null;
  if (allRecordedBlobs.length > 0) {
    const firstBlobType = allRecordedBlobs[0].type || currentSegmentMimeType || 'audio/webm';
    logAudio(`Creating final audio blob from ${allRecordedBlobs.length} collected blobs. Using type: ${firstBlobType}`);
    finalBlob = new Blob(allRecordedBlobs, { type: firstBlobType });
    logAudio(`Final audio blob created. Size: ${finalBlob?.size}, Type: ${finalBlob?.type}`);
  } else {
    logAudio("No recorded blobs to create a final audio file.");
  }
  allRecordedBlobs.length = 0; 

  isMicMutedByUser = false;
  serviceCallbacks?.onMicMuteStateChange?.(false);

  if (previousState !== RecordingState.Error) { 
     updateState(RecordingState.Stopped, { fullAudioBlob: finalBlob });
  } else if (internalState !== RecordingState.Error) { 
    serviceCallbacks?.onStateChange(RecordingState.Error, { errorMessage: "Ghi âm dừng do lỗi trước đó.", fullAudioBlob: finalBlob });
  }
};


// --- Public API ---
export const initAudioService = (callbacks: ServiceCallbacks) => {
  serviceCallbacks = callbacks;
  updateState(RecordingState.Idle);
  isMicMutedByUser = false; // Ensure mute state is reset on init
  serviceCallbacks?.onMicMuteStateChange?.(false);
};

export const startAudioProcessing = async (sourceLanguageCode: string) => {
  if (internalState !== RecordingState.Idle && internalState !== RecordingState.Stopped && internalState !== RecordingState.Error) {
    logAudio("Start_Audio_Processing được gọi khi không ở trạng thái Idle/Stopped/Error. Trạng thái hiện tại:", internalState);
    return;
  }
  updateState(RecordingState.Initializing);
  allRecordedBlobs.length = 0; 
  currentSourceLanguageCode = sourceLanguageCode; // Store the language code
  
  isMicMutedByUser = false; // Ensure mic is unmuted at the start of new processing
  serviceCallbacks?.onMicMuteStateChange?.(false);


  const streamsAcquired = await acquireAudioStreams();
  if (!streamsAcquired) {
    performFinalCleanup(); 
    return;
  }
  
  if (!userMicStream) { 
    updateState(RecordingState.Error, { errorMessage: "Luồng micro không khả dụng sau khi khởi tạo." });
    performFinalCleanup();
    return;
  }
  // Ensure mic tracks are enabled (in case they were left disabled from a previous error/state)
  originalMicTracks.forEach(track => track.enabled = true);

  await setupAudioVisualizer(userMicStream);
  currentSegmentMimeType = determineSegmentMimeType();
  if (!currentSegmentMimeType) {
      logAudio("Warning: MediaRecorder không hỗ trợ bất kỳ loại MIME ưa thích nào. Quá trình ghi có thể không thành công hoặc tạo ra tệp không thể sử dụng được.");
      // updateState(RecordingState.Error, { errorMessage: "Trình duyệt không hỗ trợ các định dạng ghi âm cần thiết." });
      // performFinalCleanup();
      // return;
      // Decided to let it try with browser default instead of failing hard here.
  }
  
  updateState(RecordingState.Recording);
  startNextSegmentRecording();
};

export const stopAudioProcessing = () => {
  if (internalState === RecordingState.Recording) {
    updateState(RecordingState.Stopping);
    if (segmentRecorder && segmentRecorder.state === "recording") {
      segmentRecorder.stop(); 
    } else {
      performFinalCleanup();
    }
  } else if (internalState === RecordingState.Initializing) {
      updateState(RecordingState.Stopping); 
      performFinalCleanup(); 
  } else {
    logAudio("Stop_Audio_Processing được gọi khi không ghi âm hoặc khởi tạo. Trạng thái:", internalState);
  }
};

export const toggleMicrophoneMute = () => {
    if (internalState !== RecordingState.Recording) {
        logAudio("Cannot toggle mute: Not currently recording.");
        return;
    }
    if (!userMicStream || originalMicTracks.length === 0) {
        logAudio("Cannot toggle mute: User microphone stream or tracks not available.");
        return;
    }
    isMicMutedByUser = !isMicMutedByUser;
    originalMicTracks.forEach(track => {
        track.enabled = !isMicMutedByUser;
    });
    logAudio(`Microphone mute toggled. Mic is now ${isMicMutedByUser ? 'MUTED' : 'UNMUTED'}. Tracks enabled: ${!isMicMutedByUser}`);
    serviceCallbacks?.onMicMuteStateChange?.(isMicMutedByUser);

    // If muted, ensure volume indicator shows 0 immediately
    if (isMicMutedByUser) {
        serviceCallbacks?.onVolumeUpdate(0, 'normal');
    }
};

export const cleanupAudioService = () => {
  if (internalState === RecordingState.Recording || internalState === RecordingState.Stopping || internalState === RecordingState.Initializing) {
    stopAudioProcessing(); 
  } else {
    performFinalCleanup(); 
  }
  serviceCallbacks = null; 
};

export const getCurrentAudioState = (): RecordingState => {
    return internalState;
};

export const getIsMicMuted = (): boolean => {
    return isMicMutedByUser;
};
