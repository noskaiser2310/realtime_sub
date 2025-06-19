import bcrypt from 'https://esm.sh/bcryptjs@^2.4.3';
import { track } from '@vercel/analytics';
import type { SummaryContent } from '../types';
import { INITIAL_SUMMARY_CONTENT } from '../constants';

// Storage Keys
const USER_STORAGE_KEY = 'meetingAssistantUser';
const USERS_DB_KEY = 'meetingAssistantUsersDB';
const SESSIONS_STORAGE_KEY_PREFIX = 'meetingAssistantSessions_';
const ANALYTICS_KEY = 'meetingAssistantAnalytics';

// Interfaces
export interface MeetingSessionData {
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
  passwordHash: string;
  createdAt: string;
}

interface CurrentUserSession {
  userId: string;
  userName: string;
}

interface AnalyticsData {
  totalRegistrations: number;
  totalLogins: number;
  totalUsers: number;
  lastUpdated: string;
}

// State
let currentUserSession: CurrentUserSession | null = null;
let activeMeetingSessionData: Partial<MeetingSessionData> | null = null;
let activeMeetingSessionId: string | null = null;

// Extend Window for footer updates
declare global {
  interface Window {
    updateFooterStats?: (stats: AnalyticsData) => void;
  }
}

// Database Helpers
const getUsersFromDB = (): StoredUser[] => {
  const usersJson = localStorage.getItem(USERS_DB_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

const saveUsersToDB = (users: StoredUser[]) => {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
};

const getMeetingSessionsKeyForCurrentUser = (): string | null => {
  const userId = getCurrentUserId();
  return userId ? `${SESSIONS_STORAGE_KEY_PREFIX}${userId}` : null;
};

// Analytics Functions
const getAnalyticsData = (): AnalyticsData => {
  const stored = localStorage.getItem(ANALYTICS_KEY);
  if (!stored) {
    return {
      totalRegistrations: 0,
      totalLogins: 0,
      totalUsers: 0,
      lastUpdated: new Date().toISOString()
    };
  }
  return JSON.parse(stored);
};

const saveAnalyticsData = (analytics: AnalyticsData) => {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
  
  if (window.updateFooterStats) {
    window.updateFooterStats(analytics);
  }
};

const updateAnalytics = (type: 'registration' | 'login') => {
  const analytics = getAnalyticsData();
  
  if (type === 'registration') {
    analytics.totalRegistrations++;
    analytics.totalUsers = getUsersFromDB().length;
  } else if (type === 'login') {
    analytics.totalLogins++;
  }
  
  analytics.lastUpdated = new Date().toISOString();
  saveAnalyticsData(analytics);
};

// Analytics Export
export const getAnalyticsStats = (): AnalyticsData => {
  const analytics = getAnalyticsData();
  analytics.totalUsers = getUsersFromDB().length;
  return analytics;
};

// User Authentication
export const registerUser = async (userName: string, passwordPlain: string): Promise<CurrentUserSession | null> => {
  const users = getUsersFromDB();
  if (users.some(u => u.userName.toLowerCase() === userName.toLowerCase())) {
    console.warn(`Registration failed: Username '${userName}' already exists.`);
    return null;
  }

  const saltRounds = 8;
  const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);
  
  const newUser: StoredUser = {
    userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userName: userName,
    passwordHash: passwordHash,
    createdAt: new Date().toISOString(),
  };
  
  users.push(newUser);
  saveUsersToDB(users);
  
  // Track registration analytics
  updateAnalytics('registration');
  
  // Track global registration via Vercel Analytics
  track('user_registered', { 
    userId: newUser.userId,
    userName: userName,
    timestamp: Date.now()
  });
  
  console.log(`User '${userName}' registered successfully.`);
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
      
      // Track login analytics
      updateAnalytics('login');
      
      // Track global login via Vercel Analytics
      track('user_logged_in', { 
        userId: user.userId,
        userName: userName,
        timestamp: Date.now()
      });
      
      console.log(`User '${userName}' logged in successfully.`);
      return currentUserSession;
    }
  }
  console.warn(`Login failed for username '${userName}'.`);
  return null;
};

export const logoutUser = (): void => {
  currentUserSession = null;
  localStorage.removeItem(USER_STORAGE_KEY);
  console.log('User logged out.');
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

// Meeting Session Management
export const startNewMeetingSession = (sourceLang: string, targetLang: string, name?: string): MeetingSessionData | null => {
  if (!isAuthenticated()) {
    console.error("User not authenticated. Cannot start new meeting session.");
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
  
  console.log(`Started new meeting session: ${newSessionId}, Name: ${sessionName}`);
  return { ...activeMeetingSessionData } as MeetingSessionData;
};

export const updateCurrentMeetingSessionData = (sessionId: string, updates: Partial<Omit<MeetingSessionData, 'id' | 'createdAt'>>) => {
  if (!isAuthenticated()) return;

  const targetSessionIsActive = activeMeetingSessionId === sessionId && activeMeetingSessionData;
  let targetSessionData = targetSessionIsActive ? activeMeetingSessionData : getMeetingSession(sessionId);

  if (!targetSessionData) {
    console.warn(`Attempt to update non-active/non-existent meeting session ${sessionId}. Current active: ${activeMeetingSessionId}`);
    return;
  }
  
  Object.assign(targetSessionData, updates, { updatedAt: Date.now() });

  if (!targetSessionIsActive) {
    const sessionsKey = getMeetingSessionsKeyForCurrentUser();
    if (!sessionsKey) return;
    const sessions = listMeetingSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      sessions[index] = { ...targetSessionData } as MeetingSessionData;
      localStorage.setItem(sessionsKey, JSON.stringify(sessions));
      console.log(`Updated existing saved meeting session: ${sessionId}`);
    }
  } else {
    console.log(`Updated active meeting session data for ${sessionId}:`, updates);
  }
};

export const saveCurrentMeetingSession = (): MeetingSessionData | null => {
  if (!isAuthenticated() || !activeMeetingSessionId || !activeMeetingSessionData) {
    console.error("No active session or user not authenticated. Cannot save meeting session.");
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
  console.log(`Saved meeting session: ${sessionToSave.id} - ${sessionToSave.name}`);
  
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
  console.log(`Deleted meeting session: ${sessionId}`);
  
  if (activeMeetingSessionId === sessionId) {
    activeMeetingSessionId = null;
    activeMeetingSessionData = null;
  }
};

export const getCurrentActiveMeetingSessionId = (): string | null => activeMeetingSessionId;
export const getCurrentActiveMeetingSessionData = (): Partial<MeetingSessionData> | null => activeMeetingSessionData;

// Initialize
isAuthenticated();
