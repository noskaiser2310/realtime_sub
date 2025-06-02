
# Real-time Meeting Assistant (v4)

## 1. Introduction

The Real-time Meeting Assistant is a powerful web application designed to enhance meeting productivity. It leverages the Google Gemini API and browser technologies to provide real-time recording, transcription, translation, summarization, and an interactive Q&A chatbot for audio content, typically from Google Meet sessions or other browser tab audio.

Built with React, TypeScript, and Tailwind CSS, this client-side application offers a seamless experience for users needing to capture and understand meeting discussions efficiently.

## 2. Features

*   **Real-time Audio Recording:** Captures audio from the user's microphone and system/tab audio simultaneously.
*   **Live Transcription (STT):** Converts spoken audio into text in real-time using the Gemini API.
*   **Live Translation:** Translates the transcript into a selected target language in real-time using the Gemini API.
*   **Automatic Text-to-Speech (TTS):** Reads out translated text chunks automatically using the browser's built-in speech synthesis.
*   **Content Summarization:** Generates concise summaries, including key points and action items, from the meeting transcript using the Gemini API.
*   **Interactive Chatbot (Q&A):** Allows users to ask questions about the meeting content and receive answers based on the transcript, powered by the Gemini API.
*   **Data Download:** Users can download the original transcript, translated transcript, summaries, and the full audio recording.
*   **Language Selection:** Supports multiple languages for both source (transcription) and target (translation).
*   **Microphone Volume Indicator:** Provides visual feedback on the microphone input level and clarity.
*   **Responsive UI:** Designed to work across different screen sizes.

## 3. Architecture Overview

This application is a **client-side Single Page Application (SPA)**. All logic, including interactions with external APIs, runs within the user's browser.

*   **Core Framework:** React with TypeScript for building a type-safe, component-based UI.
*   **Styling:** Tailwind CSS for rapid UI development.
*   **Modularity:**
    *   **`App.tsx`:** The main orchestrator, managing global state and coordinating interactions between UI components and services.
    *   **UI Components (`./components/`)**: Reusable React components responsible for rendering specific parts of the UI and handling user interactions.
    *   **Services (`./services/`)**: Modules encapsulating specific business logic and external API interactions.
*   **API Interactions:**
    *   **Google Gemini API:** Accessed via the `@google/genai` SDK for all AI-powered features (STT, translation, summarization, Q&A).
    *   **Browser APIs:**
        *   `navigator.mediaDevices.getUserMedia` & `navigator.mediaDevices.getDisplayMedia`: For audio and screen/tab capture.
        *   `MediaRecorder`: For recording audio.
        *   `AudioContext`: For audio processing and visualization.
        *   `SpeechSynthesisUtterance` & `speechSynthesis`: For Text-to-Speech.

## 4. Core Components & Services

### 4.1 UI Components (`./components/`)

*   **`AudioControl.tsx`**: Manages recording start/stop, language selection (source/target), and displays the recording timer.
*   **`TranscriptArea.tsx`**: Displays the live transcript and its translation.
*   **`SummarySection.tsx`**: Provides UI for requesting different types of summaries and displays them.
*   **`Chatbot.tsx`**: Implements the chat interface for asking questions based on the transcript.
*   **`ErrorMessage.tsx`**: A generic component for displaying error messages.
*   **`LanguageSelector.tsx`**: Reusable dropdown for language selection.
*   **`MicrophoneVolumeIndicator.tsx`**: Visualizes the microphone's input volume.
*   **Icon Components (`./components/icons/`)**: SVG icons used throughout the application.
*   **`LoadingSpinner.tsx`**: (Located at the root alongside `App.tsx`) A reusable loading animation.

### 4.2 Services (`./services/`)

*   **`audioService.ts`**:
    *   Manages audio input from microphone and display/tab.
    *   Mixes audio sources if necessary.
    *   Segments audio into chunks for processing.
    *   Interfaces with `sttService.ts` to get transcriptions for audio chunks.
    *   Provides callbacks to `App.tsx` for state changes, new transcript chunks, and volume updates.
*   **`sttService.ts` (Speech-to-Text Service)**:
    *   Dedicated to converting audio data (base64 encoded) into text using the Gemini API.
    *   Constructs appropriate prompts for the Gemini model to perform transcription, including language hints.
    *   Returns transcribed text to `audioService.ts`.
*   **`geminiService.ts` (Text Processing Service)**:
    *   Handles all text-based interactions with the Gemini API, including:
        *   Translation of transcript chunks.
        *   Generation of summaries (key points, action items).
        *   Answering user questions based on the transcript (chatbot functionality).
    *   Implements a "meta-prompt" system to guide Gemini in producing structured output for different tasks.
*   **`ttsService.ts` (Text-to-Speech Service)**:
    *   Manages the browser's `SpeechSynthesis` API.
    *   Handles queuing, playing, pausing, resuming, and cancelling speech.
    *   Provides callbacks for TTS activity and language support changes.

## 5. Data Flow Examples

### 5.1 Recording & Transcription
1.  User clicks "Start Recording" in `AudioControl`.
2.  `App.tsx` calls `audioService.startAudioProcessing()`.
3.  `audioService` captures audio, creates `MediaRecorder`, and processes audio in chunks.
4.  For each audio chunk, `audioService` calls `sttService.transcribeAudio()`.
5.  `sttService` sends the audio data (as base64) and a transcription prompt to the Gemini API.
6.  Gemini API returns the transcribed text.
7.  `sttService` returns the transcript chunk to `audioService`.
8.  `audioService` uses the `onNewTranscriptChunk` callback to send the chunk to `App.tsx`.
9.  `App.tsx` updates its state, and the `TranscriptArea` re-renders to display the new text.

### 5.2 Translation & TTS
1.  When `App.tsx` receives a new transcript chunk, it adds it to a translation queue.
2.  `App.tsx` processes this queue, calling `geminiService.translateText()` for each chunk.
3.  `geminiService` sends the text and translation prompt (source/target languages) to the Gemini API.
4.  Gemini API returns the translated text.
5.  `geminiService` returns the translated chunk to `App.tsx`.
6.  `App.tsx` updates its state (e.g., `fullTranslatedTranscript`), and `TranscriptArea` displays it.
7.  If "Auto Speak" is enabled and the target language is supported by TTS, `App.tsx` calls `ttsService.speak()` with the translated chunk.
8.  `ttsService` uses the browser's SpeechSynthesis API to speak the text.

### 5.3 Summarization
1.  User clicks a "Summarize" button in `SummarySection`.
2.  `App.tsx` calls `geminiService.summarizeText()`, passing the full transcript and summary type.
3.  `geminiService` sends the transcript and a summarization prompt to the Gemini API.
4.  Gemini API returns the summary.
5.  `geminiService` returns the summary to `App.tsx`.
6.  `App.tsx` updates its state, and `SummarySection` displays the generated summary.

## 6. Setup and Running

### 6.1 Prerequisites
*   A modern web browser with support for WebRTC (getUserMedia, getDisplayMedia), Web Audio API, and SpeechSynthesis API.
*   An internet connection.

### 6.2 API Key for Google Gemini
This application requires a Google Gemini API key.
*   The API key **must** be available in the execution environment as `process.env.API_KEY`.
*   The application code directly uses `process.env.API_KEY` to initialize the `@google/genai` client.
*   **Important:** There is no UI or mechanism within the application to input or manage the API key. It is assumed to be pre-configured in the environment where the application is run/tested.

### 6.3 Running the Application
The application is structured to be served as a set of static files (`index.html`, bundled JavaScript from `.tsx` files).
1.  Ensure `index.html` and all compiled/transpiled JavaScript files (from `.tsx` sources) are served by a local web server or hosted on a static site provider.
2.  Open `index.html` in your web browser.
    *   The `index.html` uses an import map for ES module resolution in the browser, simplifying local development without complex build tooling for basic cases. For production, a bundler like esbuild, Webpack, or Vite would typically be used.

(If a `package.json` with build/start scripts were part of the project, instructions like `npm install` and `npm start` would be included here.)

## 7. Project Structure

A simplified view of the project structure:

```
/
├── index.html                    # Main HTML entry point
├── index.tsx                     # Main React application bootstrap
├── App.tsx                       # Root React component, orchestrator
├── components/                   # UI React components
│   ├── icons/                    # SVG icon components
│   ├── AudioControl.tsx
│   ├── Chatbot.tsx
│   ├── ErrorMessage.tsx
│   ├── LanguageSelector.tsx
│   ├── MicrophoneVolumeIndicator.tsx
│   ├── SummarySection.tsx
│   └── TranscriptArea.tsx
├── services/                     # Logic and API interaction modules
│   ├── audioService.ts
│   ├── geminiService.ts
│   ├── sttService.ts
│   └── ttsService.ts
├── constants.ts                  # Application-wide constants
├── LoadingSpinner.tsx            # Reusable loading spinner component
├── types.ts                      # TypeScript type definitions
├── metadata.json                 # Application metadata (name, permissions)
└── Readme.md                     # This file
```

## 8. Key Technologies Used

*   **React 19:** For building the user interface.
*   **TypeScript:** For static typing and improved code quality.
*   **Tailwind CSS:** For utility-first CSS styling (via CDN in `index.html`).
*   **Google Gemini API (`@google/genai` SDK):** For Speech-to-Text, translation, summarization, and Q&A.
*   **Browser APIs:**
    *   WebRTC (`getUserMedia`, `getDisplayMedia`): Audio/Screen capture.
    *   Web Audio API (`AudioContext`, `AnalyserNode`): Audio processing and visualization.
    *   `MediaRecorder`: Audio recording.
    *   `SpeechSynthesis` API: Text-to-Speech.
*   **ES Modules & Import Maps:** For module handling directly in the browser (as configured in `index.html`).

## 9. Future Enhancements

*   User authentication to save preferences and history.
*   Persistent storage for transcripts, summaries, and user settings.
*   Advanced TTS voice selection and customization.
*   Editable transcripts with speaker diarization (if supported by Gemini).
*   More granular error handling and user feedback for API rate limits or failures.
*   Improved UI/UX for mobile devices.

---
_This README provides a comprehensive overview of the Real-time Meeting Assistant application._
```