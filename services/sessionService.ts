import bcrypt from 'https://esm.sh/bcryptjs@^2.4.3';
import type { SummaryContent, LanguageOption } from '../types';
import { INITIAL_SUMMARY_CONTENT } from '../constants';

const USER_STORAGE_KEY = 'meetingAssistantUser'; // Stores current logged-in user's basic info
const USERS_DB_KEY = 'meetingAssistantUsersDB'; // Stores all registered users' "hashed" passwords
const SESSIONS_STORAGE_KEY_PREFIX = 'meetingAssistantSessions_'; // For meeting data

export interface MeetingSessionData { // Renamed from SessionData to distinguish from UserSession
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceLang: string;
  targetLang: string;
  transcript: string;
  translatedTranscript?: string;
  summary?: SummaryContent;
  audioBlobUrl?: string;
  audioMimeType?: string;
  isComplete: boolean;
}

interface StoredUser {
  userId: string;
  userName: string;
  passwordHash: string; // Store "hashed" password
  createdAt: string;
}

interface CurrentUserSession { // User session info (logged in user)
  userId: string;
  userName: string;
}

let currentUserSession: CurrentUserSession | null = null;

// --- User Authentication ---

const getUsersFromDB = (): StoredUser[] => {
  const usersJson = localStorage.getItem(USERS_DB_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

const saveUsersToDB = (users: StoredUser[]) => {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
};

export const registerUser = async (userName: string, passwordPlain: string): Promise<CurrentUserSession | null> => {
  const users = getUsersFromDB();
  if (users.some(u => u.userName.toLowerCase() === userName.toLowerCase())) {
    console.warn(`[SessionService] Registration failed: Username '${userName}' already exists.`);
    return null; // Username exists
  }

  const saltRounds = 8; // Lower for client-side demo, real backend would use more
  const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);
  
  const newUser: StoredUser = {
    userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userName: userName,
    passwordHash: passwordHash,
    createdAt: new Date().toISOString(),
  };
  
  users.push(newUser);
  saveUsersToDB(users);
  console.log(`[SessionService] User '${userName}' registered successfully.`);
  // Automatically log in the new user
  return loginUser(userName, passwordPlain);
};

export const loginUser = async (userName: string, passwordPlain: string): Promise<CurrentUserSession | null> => {
  const users = getUsersFromDB();
  const user = users.find(u => u.userName.toLowerCase() === userName.toLowerCase());

  if (user) {
    const passwordMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (passwordMatch) {
      currentUserSession = { userId: user.userId, userName: user.userName };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUserSession));
      console.log(`[SessionService] User '${userName}' logged in successfully.`);
      return currentUserSession;
    }
  }
  console.warn(`[SessionService] Login failed for username '${userName}'.`);
  return null; // Invalid credentials or user not found
};

export const logoutUser = (): void => {
  currentUserSession = null;
  localStorage.removeItem(USER_STORAGE_KEY);
  console.log('[SessionService] User logged out.');
  // Note: Meeting session data associated with the user ID remains in localStorage.
  // A real app might offer to clear this or handle it differently.
};

export const isAuthenticated = (): boolean => {
  if (currentUserSession) return true;
  const storedUserSession = localStorage.getItem(USER_STORAGE_KEY);
  if (storedUserSession) {
    currentUserSession = JSON.parse(storedUserSession);
    return true;
  }
  return false;
};

export const getCurrentUserId = (): string | null => {
  return isAuthenticated() ? currentUserSession!.userId : null;
};

export const getCurrentUserName = (): string | null => {
  return isAuthenticated() ? currentUserSession!.userName : null;
};


// --- Meeting Session Management (scoped to logged-in user) ---
const getMeetingSessionsKeyForCurrentUser = (): string | null => {
    const userId = getCurrentUserId();
    return userId ? `${SESSIONS_STORAGE_KEY_PREFIX}${userId}` : null;
}

let activeMeetingSessionData: Partial<MeetingSessionData> | null = null;
let activeMeetingSessionId: string | null = null;


export const startNewMeetingSession = (sourceLang: string, targetLang: string, name?: string): MeetingSessionData | null => {
    if (!isAuthenticated()) {
        console.error("[SessionService] User not authenticated. Cannot start new meeting session.");
        return null;
    }
    const now = Date.now();
    const newSessionId = `msession_${now}_${Math.random().toString(36).substring(2, 9)}`;
    activeMeetingSessionId = newSessionId;
    
    const sessionName = name || `Phiên làm việc lúc ${new Date(now).toLocaleTimeString()}`;

    activeMeetingSessionData = {
        id: newSessionId,
        name: sessionName,
        createdAt: now,
        updatedAt: now,
        sourceLang: sourceLang,
        targetLang: targetLang,
        transcript: '',
        isComplete: false,
        summary: { ...INITIAL_SUMMARY_CONTENT },
    };
    console.log(`[SessionService] Started new meeting session for user ${getCurrentUserId()}: ${newSessionId}, Name: ${sessionName}`);
    return { ...activeMeetingSessionData } as MeetingSessionData;
};

export const updateCurrentMeetingSessionData = (sessionId: string, updates: Partial<Omit<MeetingSessionData, 'id' | 'createdAt'>>) => {
    if (!isAuthenticated()) return;

    const targetSessionIsActive = activeMeetingSessionId === sessionId && activeMeetingSessionData;
    let targetSessionData = targetSessionIsActive ? activeMeetingSessionData : getMeetingSession(sessionId);

    if (!targetSessionData) {
        console.warn(`[SessionService] Attempt to update non-active/non-existent meeting session ${sessionId}. Current active: ${activeMeetingSessionId}`);
        return;
    }
    
    Object.assign(targetSessionData, updates, { updatedAt: Date.now() });

    if (!targetSessionIsActive) { // If updating an already saved session (e.g. re-summarizing)
        const sessionsKey = getMeetingSessionsKeyForCurrentUser();
        if (!sessionsKey) return;
        const sessions = listMeetingSessions();
        const index = sessions.findIndex(s => s.id === sessionId);
        if (index !== -1) {
            sessions[index] = { ...targetSessionData } as MeetingSessionData;
            localStorage.setItem(sessionsKey, JSON.stringify(sessions));
            console.log(`[SessionService] Updated existing saved meeting session: ${sessionId}`);
        }
    } else {
        console.log(`[SessionService] Updated active meeting session data for ${sessionId}:`, updates);
    }
};

export const saveCurrentMeetingSession = (): MeetingSessionData | null => {
    if (!isAuthenticated() || !activeMeetingSessionId || !activeMeetingSessionData) {
        console.error("[SessionService] No active session or user not authenticated. Cannot save meeting session.");
        return null;
    }
    const sessionsKey = getMeetingSessionsKeyForCurrentUser();
    if (!sessionsKey) return null;

    const sessionToSave: MeetingSessionData = { 
        ...activeMeetingSessionData, 
        isComplete: true, 
        updatedAt: Date.now() 
    } as MeetingSessionData;
    
    const sessions = listMeetingSessions();
    const existingIndex = sessions.findIndex(s => s.id === activeMeetingSessionId);
    if (existingIndex !== -1) {
        sessions[existingIndex] = sessionToSave;
    } else {
        sessions.unshift(sessionToSave);
    }
    localStorage.setItem(sessionsKey, JSON.stringify(sessions));
    console.log(`[SessionService] Saved meeting session: ${sessionToSave.id} - ${sessionToSave.name} for user ${getCurrentUserId()}`);
    
    // Clear active session state after saving
    activeMeetingSessionId = null;
    activeMeetingSessionData = null;
    return sessionToSave;
};

export const listMeetingSessions = (): MeetingSessionData[] => {
    const sessionsKey = getMeetingSessionsKeyForCurrentUser();
    if (!sessionsKey) return [];
    const storedSessions = localStorage.getItem(sessionsKey);
    return storedSessions ? JSON.parse(storedSessions) : [];
};

export const getMeetingSession = (sessionId: string): MeetingSessionData | null => {
    const sessions = listMeetingSessions();
    return sessions.find(s => s.id === sessionId) || null;
};

export const deleteMeetingSession = (sessionId: string): void => {
    const sessionsKey = getMeetingSessionsKeyForCurrentUser();
    if (!sessionsKey) return;

    let sessions = listMeetingSessions();
    sessions = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(sessionsKey, JSON.stringify(sessions));
    console.log(`[SessionService] Deleted meeting session: ${sessionId} for user ${getCurrentUserId()}`);
     if (activeMeetingSessionId === sessionId) {
        activeMeetingSessionId = null;
        activeMeetingSessionData = null;
    }
};

export const getCurrentActiveMeetingSessionId = (): string | null => activeMeetingSessionId;
export const getCurrentActiveMeetingSessionData = (): Partial<MeetingSessionData> | null => activeMeetingSessionData;


// Initialize user session from localStorage if exists
isAuthenticated();