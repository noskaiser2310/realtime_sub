
// services/ttsService.ts

interface TTSCallbacks {
  onError: (message: string) => void;
  onActivityStateChange: (isSpeaking: boolean, isPaused: boolean) => void;
  onLanguageSupportChange: (langCode: string, isSupported: boolean) => void;
}

interface CustomSpeechSynthesisUtterance extends SpeechSynthesisUtterance {
  __originalLengthToAdvance?: number;
}

let ttsCallbacks: TTSCallbacks | null = null;
let currentUtterance: CustomSpeechSynthesisUtterance | null = null;

// --- State Variables ---
let fullTextBuffer: string = "";
let lastSpokenIndex: number = 0;
let currentLanguage: string = "en-US";

let isSystemSpeaking: boolean = false;
let isManuallyPaused: boolean = false;
let utteranceWasCancelled: boolean = false;

let voicesLoadedAtLeastOnce: boolean = false;
let lastCheckedLangForSupport: string | null = null;

let voiceLoadAttemptInterval: number | null = null;
const MAX_VOICE_LOAD_ATTEMPTS = 7;
let voiceLoadAttempts: number = 0;

const log = (message: string, ...args: any[]) => {
  console.log(`[TTS Service] ${message}`, ...args);
};

const updateActivityState = () => {
  if (!ttsCallbacks) return;
  const hasUnreadText = fullTextBuffer.substring(lastSpokenIndex).trim() !== "";
  const overallSpeaking = isSystemSpeaking || (hasUnreadText && !isManuallyPaused);
  ttsCallbacks.onActivityStateChange(overallSpeaking, isManuallyPaused && isSystemSpeaking);
  log(`Updated activity state: overallSpeaking=${overallSpeaking}, isManuallyPaused=${isManuallyPaused}, isSystemSpeaking=${isSystemSpeaking}, hasUnreadText=${hasUnreadText}`);
};

const getVoicesForLanguage = (lang: string): SpeechSynthesisVoice[] => {
    if (typeof speechSynthesis === 'undefined') return [];
    const voices = speechSynthesis.getVoices();
    if (!voicesLoadedAtLeastOnce && voices.length > 0) {
        voicesLoadedAtLeastOnce = true; 
        log("Voices became available after initial check. Total voices:", voices.length);
    }
    return voices.filter(voice => voice.lang === lang || voice.lang.startsWith(lang.split('-')[0]));
};

const checkAndReportLanguageSupport = (langCode: string) => {
    if (!ttsCallbacks || !langCode) return;
    lastCheckedLangForSupport = langCode;
    const isSupported = voicesLoadedAtLeastOnce && getVoicesForLanguage(langCode).length > 0;
    log(`Language support for "${langCode}": ${isSupported} (voicesLoadedAtLeastOnce: ${voicesLoadedAtLeastOnce}, available voices for lang: ${getVoicesForLanguage(langCode).length})`);
    ttsCallbacks.onLanguageSupportChange(langCode, isSupported);
};

const handleVoicesChanged = () => {
    voicesLoadedAtLeastOnce = true;
    log("onvoiceschanged triggered. Total voices:", speechSynthesis.getVoices().length);
    if (voiceLoadAttemptInterval) { 
        clearInterval(voiceLoadAttemptInterval);
        voiceLoadAttemptInterval = null;
        log("Polling for voices stopped due to onvoiceschanged.");
    }
    if (lastCheckedLangForSupport && ttsCallbacks) {
        checkAndReportLanguageSupport(lastCheckedLangForSupport);
    }
};

const attemptLoadVoices = () => {
  if (typeof speechSynthesis === 'undefined') {
    if (voiceLoadAttemptInterval) clearInterval(voiceLoadAttemptInterval);
    voiceLoadAttemptInterval = null;
    return;
  }

  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesLoadedAtLeastOnce = true;
    if (voiceLoadAttemptInterval) clearInterval(voiceLoadAttemptInterval);
    voiceLoadAttemptInterval = null;
    log(`Voices loaded via polling. Count: ${voices.length}. Setting onvoiceschanged.`);
    speechSynthesis.onvoiceschanged = handleVoicesChanged; 
    if (lastCheckedLangForSupport && ttsCallbacks) { 
        checkAndReportLanguageSupport(lastCheckedLangForSupport);
    }
  } else {
    voiceLoadAttempts++;
    log(`Voice load attempt ${voiceLoadAttempts}/${MAX_VOICE_LOAD_ATTEMPTS}. Still no voices.`);
    if (voiceLoadAttempts >= MAX_VOICE_LOAD_ATTEMPTS) {
      if (voiceLoadAttemptInterval) clearInterval(voiceLoadAttemptInterval);
      voiceLoadAttemptInterval = null;
      log("Max voice load attempts reached. Relying solely on onvoiceschanged if it fires.");
      speechSynthesis.onvoiceschanged = handleVoicesChanged;
    }
  }
};

const tryToSpeakNextSegment = () => {
    log(`--- tryToSpeakNextSegment ---
    isManuallyPaused: ${isManuallyPaused}, isSystemSpeaking: ${isSystemSpeaking}
    BrowserSpeaking: ${speechSynthesis?.speaking}, BrowserPending: ${speechSynthesis?.pending}
    CurrentUtterance: ${currentUtterance ? `"${currentUtterance.text.substring(0,20)}..."` : 'null'}
    lastSpokenIndex: ${lastSpokenIndex}, fullTextBuffer (first 50): "${fullTextBuffer.substring(0,50)}"`);

    if (isManuallyPaused || typeof speechSynthesis === 'undefined') {
        log("tryToSpeakNextSegment: Bailing (manually paused or speechSynthesis undefined).");
        updateActivityState();
        return;
    }
    
    if (currentUtterance && (speechSynthesis.speaking || speechSynthesis.pending)) {
        log("tryToSpeakNextSegment: Bailing (currentUtterance exists AND browser is speaking/pending). This utterance should resolve itself via onend/onerror.");
        return; 
    }
    
    if (!currentUtterance && (speechSynthesis.speaking || speechSynthesis.pending)) {
        log("tryToSpeakNextSegment: No current TTS service utterance, but browser is speaking/pending. Attempting to cancel system queue to clear potentially stuck utterance.");
        // utteranceWasCancelled = true; // Not strictly true as it's a system clear attempt
        speechSynthesis.cancel(); 
        // After cancel, the browser's state should clear. We'll re-evaluate on the next call or after a short delay.
        log("tryToSpeakNextSegment: Called cancel(). Will attempt to speak again shortly.");
        setTimeout(tryToSpeakNextSegment, 100); // Give cancel time to take effect
        return; 
    }

    const originalUntrimmedSegment = fullTextBuffer.substring(lastSpokenIndex);
    const segmentToSpeak = originalUntrimmedSegment.trim();
    log(`tryToSpeakNextSegment: Processing from lastSpokenIndex=${lastSpokenIndex}.
    Original untrimmed segment (first 50): "${originalUntrimmedSegment.substring(0,50)}"
    Trimmed segmentToSpeak (first 50): "${segmentToSpeak.substring(0,50)}"`);

    if (segmentToSpeak === "") {
        log("tryToSpeakNextSegment: No new text segment to speak after trimming.");
        if (!speechSynthesis.speaking && !speechSynthesis.pending) {
            isSystemSpeaking = false; 
            log("tryToSpeakNextSegment: Set isSystemSpeaking=false as nothing to speak and browser idle.");
        }
        currentUtterance = null; 
        updateActivityState();
        return;
    }
    
    if (currentUtterance) {
        log("tryToSpeakNextSegment: WARNING - currentUtterance was not null when trying to speak a new segment. Detaching old handlers.");
        currentUtterance.onstart = null;
        currentUtterance.onend = null;
        currentUtterance.onerror = null;
        currentUtterance = null; // Should have been cleared by onend/onerror if it was a valid utterance
    }

    const newUtterance = new SpeechSynthesisUtterance(segmentToSpeak) as CustomSpeechSynthesisUtterance;
    newUtterance.lang = currentLanguage;
    newUtterance.__originalLengthToAdvance = originalUntrimmedSegment.length; // Store length of untrimmed segment from buffer
    currentUtterance = newUtterance; 
    log(`tryToSpeakNextSegment: Created new utterance. Text (first 50): "${newUtterance.text.substring(0,50)}", lang: ${newUtterance.lang}, __originalLengthToAdvance: ${newUtterance.__originalLengthToAdvance}`);

    const availableVoices = getVoicesForLanguage(currentLanguage);
    if (availableVoices.length > 0) {
        currentUtterance.voice = availableVoices.find(v => v.default && v.localService) ||
                                availableVoices.find(v => v.localService) ||
                                availableVoices[0];
        log(`Using voice: "${currentUtterance.voice.name}" (lang: ${currentUtterance.voice.lang}, default: ${currentUtterance.voice.default}, local: ${currentUtterance.voice.localService}) for target lang "${currentLanguage}"`);
    } else {
        log(`No specific voice found for "${currentLanguage}". Browser will use default.`);
    }

    currentUtterance.onstart = () => {
        if (currentUtterance !== newUtterance) {
            log("onstart: Fired for an old utterance. Ignoring.");
            return;
        }
        log(`Speech STARTED for segment: "${newUtterance.text.substring(0, 50)}..."`);
        isSystemSpeaking = true;
        utteranceWasCancelled = false; 
        if (!speechSynthesis.paused) isManuallyPaused = false; 
        updateActivityState();
    };

    currentUtterance.onend = (event) => {
        if (event.target !== currentUtterance) { 
            log("onend: Fired for an old/unexpected utterance. Ignoring.");
            return;
        }
        const endedUtteranceText = (event.target as SpeechSynthesisUtterance)?.text || "";
        log(`Speech ENDED for segment: "${endedUtteranceText.substring(0,50)}...". Service's utteranceWasCancelled flag: ${utteranceWasCancelled}. Event charIndex: ${event.charIndex}, elapsedTime: ${event.elapsedTime}ms`);
        
        const oldLastSpokenIndex = lastSpokenIndex;
        if (!utteranceWasCancelled) { 
            const lengthToAdvance = (event.target as CustomSpeechSynthesisUtterance)?.__originalLengthToAdvance;
            if (typeof lengthToAdvance === 'number') {
                lastSpokenIndex += lengthToAdvance;
                log(`onend: Advanced lastSpokenIndex by __originalLengthToAdvance: ${lengthToAdvance}.`);
            } else {
                lastSpokenIndex += endedUtteranceText.length; 
                log(`onend: WARNING - Advanced lastSpokenIndex by utterance text length (fallback): ${endedUtteranceText.length}. This might be inaccurate if original segment had leading/trailing spaces.`);
            }
            lastSpokenIndex = Math.min(lastSpokenIndex, fullTextBuffer.length);
            log(`onend: lastSpokenIndex updated from ${oldLastSpokenIndex} to ${lastSpokenIndex}.`);
        } else {
            log("onend: Speech was cancelled (utteranceWasCancelled=true), lastSpokenIndex not advanced by this ended utterance. Remains ${lastSpokenIndex}.");
        }
        
        isSystemSpeaking = false;
        currentUtterance = null; 
        updateActivityState();
        log("onend: Calling tryToSpeakNextSegment from onend.");
        setTimeout(tryToSpeakNextSegment, 50); 
    };

    currentUtterance.onerror = (event) => {
        if (event.target !== currentUtterance) { 
            log("onerror: Fired for an old/unexpected utterance. Ignoring.");
            return;
        }
        const errorMsg = event.error || "unknown TTS error";
        log(`Speech ERROR for segment: "${newUtterance.text.substring(0, 50)}...". Error: ${errorMsg}. Service's utteranceWasCancelled flag: ${utteranceWasCancelled}`);
        
        if (!(errorMsg === 'interrupted' && utteranceWasCancelled)) {
            ttsCallbacks?.onError(`Lỗi phát âm thanh: ${errorMsg}`);
        } else {
            log("onerror: Error was 'interrupted' and utteranceWasCancelled is true (intentional interruption). Suppressing error report to UI.");
        }
        
        isSystemSpeaking = false;
        currentUtterance = null; 
        updateActivityState();
        log("onerror: Calling tryToSpeakNextSegment from onerror after handling error/interruption.");
        setTimeout(tryToSpeakNextSegment, 50); 
    };

    try {
      log(`Attempting to speak via speechSynthesis.speak(): "${currentUtterance.text.substring(0,50)}..." Lang: ${currentUtterance.lang}`);
      speechSynthesis.speak(currentUtterance);
    } catch (e) {
      const errorMsg = (e as Error).message || "Failed to call speechSynthesis.speak";
      log(`IMMEDIATE ERROR calling speechSynthesis.speak(): ${errorMsg}`, e);
      ttsCallbacks?.onError(`Lỗi TTS tức thời: ${errorMsg}`);
      
      isSystemSpeaking = false;
      currentUtterance = null; 
      updateActivityState();
      log("Calling tryToSpeakNextSegment from immediate speak error catch block.");
      setTimeout(tryToSpeakNextSegment, 50);
    }
};

const _internalInitLogic = (callbacks: TTSCallbacks, initialTargetLang?: string) => {
  log("Initializing TTS Service...");
  ttsCallbacks = callbacks;
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
    log("SpeechSynthesis API not supported.");
    callbacks.onError("Tính năng phát âm thanh không được trình duyệt này hỗ trợ.");
    return;
  }

  if (currentUtterance) {
      currentUtterance.onstart = null;
      currentUtterance.onend = null;
      currentUtterance.onerror = null;
  }
  speechSynthesis.cancel(); 

  fullTextBuffer = "";
  lastSpokenIndex = 0;
  isSystemSpeaking = false;
  isManuallyPaused = false;
  utteranceWasCancelled = false;
  currentUtterance = null;
  
  voicesLoadedAtLeastOnce = speechSynthesis.getVoices().length > 0; 
  log(`Initial voicesLoadedAtLeastOnce: ${voicesLoadedAtLeastOnce}`);

  if (voiceLoadAttemptInterval) clearInterval(voiceLoadAttemptInterval);
  voiceLoadAttemptInterval = null;
  voiceLoadAttempts = 0;

  currentLanguage = initialTargetLang || navigator.language || 'en-US';
  lastCheckedLangForSupport = currentLanguage;
  log(`Initial language set to: ${currentLanguage}`);

  speechSynthesis.onvoiceschanged = handleVoicesChanged;
  log("onvoiceschanged handler assigned.");

  if (!voicesLoadedAtLeastOnce) {
    log("Voices not immediately available, starting polling attempts.");
    attemptLoadVoices(); 
    voiceLoadAttemptInterval = window.setInterval(attemptLoadVoices, 700); 
  } else {
      log("Voices were available on init. Reporting support for initial language.");
      if (ttsCallbacks && lastCheckedLangForSupport) { 
          checkAndReportLanguageSupport(lastCheckedLangForSupport);
      }
  }
  updateActivityState();
};

export const init = (callbacks: TTSCallbacks, initialTargetLang?: string) => {
  _internalInitLogic(callbacks, initialTargetLang);
  if (voicesLoadedAtLeastOnce && initialTargetLang && ttsCallbacks) {
      log("Re-checking language support after init for initialTargetLang:", initialTargetLang);
      checkAndReportLanguageSupport(initialTargetLang);
  }
};

export const speak = (text: string, lang: string, replaceExisting: boolean = false) => {
  log(`--- speak() API call ---
    Text (first 50): "${text.substring(0,50)}...", Lang: ${lang}, Replace: ${replaceExisting}
    Current lastSpokenIndex: ${lastSpokenIndex}, Current fullTextBuffer (first 50): "${fullTextBuffer.substring(0,50)}"`);

  if (typeof speechSynthesis === 'undefined') {
    log("speak() called but SpeechSynthesis not available.");
    ttsCallbacks?.onError("TTS service not available.");
    return;
  }

  currentLanguage = lang; 
  if (lang !== lastCheckedLangForSupport || !voicesLoadedAtLeastOnce) {
      log(`speak(): Language changed to "${lang}" or voices weren't confirmed loaded. Checking support.`);
      checkAndReportLanguageSupport(lang); 
  }
  
  isManuallyPaused = false; // New text implies an intent to play.

  if (replaceExisting) {
    log("speak(): Replacing existing text buffer with new full text.");
    fullTextBuffer = text; // `text` is the full new content
    lastSpokenIndex = 0;
    log(`speak(): replaceExisting=true. Buffer reset. New lastSpokenIndex: ${lastSpokenIndex}. New buffer (first 50): "${fullTextBuffer.substring(0,50)}"`);

    if (speechSynthesis.speaking || speechSynthesis.pending) {
      log("speak(): Cancelling current speech due to replaceExisting=true.");
      utteranceWasCancelled = true; 
      if (currentUtterance) {
        log(`speak(): Detaching handlers from currentUtterance: "${currentUtterance.text.substring(0,20)}" before global cancel.`);
        currentUtterance.onstart = null;
        currentUtterance.onend = null;
        currentUtterance.onerror = null;
      }
      speechSynthesis.cancel(); 
      isSystemSpeaking = false; 
      currentUtterance = null;  
    }
    log("speak(): Scheduled tryToSpeakNextSegment after cancelling for replaceExisting=true.");
    setTimeout(tryToSpeakNextSegment, 50); 
  } else { 
    log(`speak(): Appending new chunk. Current buffer length: ${fullTextBuffer.length}, lastSpokenIndex: ${lastSpokenIndex}. Chunk (first 50): "${text.substring(0,50)}"`);
    const oldBufferLength = fullTextBuffer.length;
    fullTextBuffer += text;
    log(`speak(): Appended. Old buffer length: ${oldBufferLength}, New buffer length: ${fullTextBuffer.length}. New fullTextBuffer (first 100): "${fullTextBuffer.substring(0,100)}"`);

    if (!speechSynthesis.speaking && !speechSynthesis.pending && !currentUtterance) {
      log("speak(): Appended text. Nothing was speaking/pending and no current service utterance, calling tryToSpeakNextSegment().");
      tryToSpeakNextSegment();
    } else {
      log("speak(): Appended text. Something is already speaking/pending or currentUtterance exists. New text is appended. Current utterance will complete, then onend will process next segment.");
    }
  }
  updateActivityState();
};


export const cancel = () => {
  log("--- cancel() API call ---");
  if (typeof speechSynthesis === 'undefined') return;
  
  utteranceWasCancelled = true; 
  if (currentUtterance) {
    log(`cancel(): Detaching handlers from currentUtterance: "${currentUtterance.text.substring(0,20)}" during API cancel.`);
    currentUtterance.onstart = null;
    currentUtterance.onend = null;
    currentUtterance.onerror = null;
  }
  speechSynthesis.cancel(); 

  fullTextBuffer = ""; 
  lastSpokenIndex = 0;   
  isSystemSpeaking = false; 
  isManuallyPaused = false;
  currentUtterance = null; 
  
  log("cancel(): Buffer cleared, index reset. Speech queue cancelled. State updated.");
  updateActivityState(); 
};

export const pause = () => {
  log("--- pause() API call ---");
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause();
    isManuallyPaused = true;
    log("pause(): Speech paused via speechSynthesis.pause().");
    updateActivityState();
  } else {
    log(`pause(): Pause called but not speaking or already paused. Speaking: ${speechSynthesis?.speaking}, Paused: ${speechSynthesis?.paused}`);
  }
};

export const resume = () => {
  log("--- resume() API call ---");
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.paused) {
    isManuallyPaused = false; 
    speechSynthesis.resume();
    log("resume(): Speech resumed via speechSynthesis.resume().");
    updateActivityState();
    // If system was not considered speaking but there's text, try to speak it.
    // This handles cases where pause might have interrupted the flow before an utterance fully started.
    if (!isSystemSpeaking && fullTextBuffer.substring(lastSpokenIndex).trim() !== "") { 
        log("resume(): isSystemSpeaking was false but text in buffer. Calling tryToSpeakNextSegment.");
        setTimeout(tryToSpeakNextSegment, 50); 
    }
  } else {
    log(`resume(): Resume called but not paused. Paused: ${speechSynthesis?.paused}`);
  }
};

export const isLanguageSupported = (langCode: string): boolean => {
  if (typeof speechSynthesis === 'undefined') return false;
  const supported = voicesLoadedAtLeastOnce && getVoicesForLanguage(langCode).length > 0;
  // Log this check because it's critical for App.tsx's logic
  // log(`isLanguageSupported Check: Lang: "${langCode}", Supported: ${supported}, VoicesLoaded: ${voicesLoadedAtLeastOnce}, VoiceCountForLang: ${getVoicesForLanguage(langCode).length}`);
  
  if (langCode !== lastCheckedLangForSupport) {
      lastCheckedLangForSupport = langCode; // Update this for onvoiceschanged handler
  }
  return supported;
};

export const hasPending = (): boolean => {
    if (typeof speechSynthesis === 'undefined') return false;
    const pending = isSystemSpeaking || 
           speechSynthesis.pending || 
           (fullTextBuffer.substring(lastSpokenIndex).trim() !== "" && !isManuallyPaused);
    return pending;
};

export const cleanup = () => {
  log("--- cleanup() API call ---");
  if (voiceLoadAttemptInterval) clearInterval(voiceLoadAttemptInterval);
  voiceLoadAttemptInterval = null;
  
  if (typeof speechSynthesis !== 'undefined') {
    if (currentUtterance) { 
        currentUtterance.onstart = null;
        currentUtterance.onend = null;
        currentUtterance.onerror = null;
    }
    speechSynthesis.cancel(); 
    speechSynthesis.onvoiceschanged = null; 
    log("cleanup(): onvoiceschanged handler removed.");
  }
  
  ttsCallbacks = null; 
  voicesLoadedAtLeastOnce = false;
  lastCheckedLangForSupport = null;
  fullTextBuffer = "";
  lastSpokenIndex = 0;
  isSystemSpeaking = false;
  isManuallyPaused = false;
  currentUtterance = null;
  log("TTS Service cleaned up.");
};
