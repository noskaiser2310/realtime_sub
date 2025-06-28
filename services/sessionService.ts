

import bcrypt from 'https://esm.sh/bcryptjs@^2.4.3';
import { track } from '@vercel/analytics';
import type { SummaryContent, PlanTierId } from '../types';
import { INITIAL_SUMMARY_CONTENT, getUsageLimitSecondsByPlan, DEFAULT_PLAN_ID } from '../constants';
import { trackUserRegistration as trackUserRegistrationGlobally, trackUserLogin as trackUserLoginGlobally, getGlobalStats } from './googleSheetsService';


// Storage Keys
const USER_STORAGE_KEY = 'meetingAssistantUser';
const USERS_DB_KEY = 'meetingAssistantUsersDB';
const SESSIONS_STORAGE_KEY_PREFIX = 'meetingAssistantSessions_';
const ANALYTICS_KEY = 'meetingAssistantAnalytics';
const INSTALL_ID_KEY = 'smartmAiInstallId';


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
  planType?: PlanTierId;
  totalAudioUsedMs?: number;
  lastAudioUsageDate?: string;
}

interface CurrentUserSession {
  userId: string;
  userName: string;
}

export interface AnalyticsData {
  totalRegistrations: number;
  totalLogins: number;
  totalUsers: number;
  lastUpdated: string;
}

export interface HybridAnalyticsData {
    localUsers: number;
    localRegistrations: number;
    localLogins: number;
    globalUsers: number;
    globalRegistrations: number;
    globalLogins: number;
    lastUpdated: string;
}


// State
let currentUserSession: CurrentUserSession | null = null;
let activeMeetingSessionData: Partial<MeetingSessionData> | null = null;
let activeMeetingSessionId: string | null = null;

// Extend Window for footer updates
declare global {
  interface Window {
    updateFooterStats?: (stats: AnalyticsData | HybridAnalyticsData) => void;
  }
}

// --- Helper Functions ---
const getUsersFromDB = (): StoredUser[] => {
  const usersJson = localStorage.getItem(USERS_DB_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
};

const saveUsersToDB = (users: StoredUser[]) => {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
};

const getMeetingSessionsKeyForCurrentUser = (): string | null => {
  const userId = getCurrentUserId(); // getCurrentUserId will call isAuthenticated, which initializes currentUserSession if needed
  return userId ? `${SESSIONS_STORAGE_KEY_PREFIX}${userId}` : null;
};

// Install ID Helper
const getOrCreateInstallId = (): string => {
  let installId = localStorage.getItem(INSTALL_ID_KEY);
  if (!installId) {
    installId = `install_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(INSTALL_ID_KEY, installId);
  }
  return installId;
};


// --- Analytics Functions ---
const getAnalyticsData = (): AnalyticsData => {
  const stored = localStorage.getItem(ANALYTICS_KEY);
  if (!stored) {
    return {
      totalRegistrations: 0,
      totalLogins: 0,
      totalUsers: getUsersFromDB().length, // Initialize with current user count
      lastUpdated: new Date().toISOString()
    };
  }
  const analytics = JSON.parse(stored) as AnalyticsData;
  // Ensure totalUsers is up-to-date if it was from an older structure
  if (analytics.totalUsers !== getUsersFromDB().length) {
    analytics.totalUsers = getUsersFromDB().length;
  }
  return analytics;
};

const saveAnalyticsData = (analytics: AnalyticsData) => {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(analytics));
};

const updateAnalytics = (type: 'registration' | 'login') => {
  const analytics = getAnalyticsData();
  
  if (type === 'registration') {
    analytics.totalRegistrations++;
    analytics.totalUsers = getUsersFromDB().length; // Update user count on new registration
  } else if (type === 'login') {
    analytics.totalLogins++;
    // totalUsers is updated via getAnalyticsData which reads from getUsersFromDB
  }
  
  analytics.lastUpdated = new Date().toISOString();
  saveAnalyticsData(analytics);
};

// Analytics Export (Local only)
export const getAnalyticsStats = (): AnalyticsData => {
  const analytics = getAnalyticsData();
  // Ensure totalUsers is absolutely current when this is called externally
  analytics.totalUsers = getUsersFromDB().length; 
  return analytics;
};

// Hybrid Analytics Export (Local + Global)
export const getHybridAnalyticsStats = async (): Promise<HybridAnalyticsData> => {
    const localStats = getAnalyticsStats(); // This now ensures totalUsers is fresh
    const globalStats = await getGlobalStats();

    return {
        localUsers: localStats.totalUsers,
        localRegistrations: localStats.totalRegistrations,
        localLogins: localStats.totalLogins,
        globalUsers: globalStats.totalUsers,
        globalRegistrations: globalStats.totalRegistrations,
        globalLogins: globalStats.totalLogins,
        lastUpdated: globalStats.lastUpdated || localStats.lastUpdated,
    };
};


// --- User Authentication ---
export const registerUser = async (userName: string, passwordPlain: string): Promise<StoredUser | null> => {
  const users = getUsersFromDB();
  if (users.some(u => u.userName.toLowerCase() === userName.toLowerCase())) {
    console.warn(`Registration failed: Username '${userName}' already exists.`);
    return null;
  }

  const saltRounds = 10; // Tăng salt rounds để an toàn hơn
  const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);
  
  const newUser: StoredUser = {
    userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userName: userName,
    passwordHash: passwordHash,
    createdAt: new Date().toISOString(),
    planType: 'guest',
    totalAudioUsedMs: 0,
    lastAudioUsageDate: new Date().toISOString(),
  };
  
  users.push(newUser);
  saveUsersToDB(users);
  
  updateAnalytics('registration');
  
  track('user_registered', { 
    userId: newUser.userId,
    userName: userName,
    timestamp: Date.now()
  });

  const installId = getOrCreateInstallId();
  // Gửi thông tin đăng ký tới dịch vụ toàn cầu.
  // Không cần `await` ở đây để tránh block trải nghiệm người dùng.
  // Việc tracking có thể chạy ngầm.
  trackUserRegistrationGlobally(newUser.userId, userName, installId)
    .then(success => {
      if (success) {
        console.log(`User '${userName}' registration tracking request sent successfully.`);
      } else {
        console.error(`Failed to send registration tracking request for user '${userName}'.`);
      }
    });
  
  console.log(`User '${userName}' registered successfully locally.`);
  return newUser;
};

/**
 * Đăng nhập người dùng và lưu session.
 * @returns CurrentUserSession nếu thành công, null nếu thất bại.
 */
export const loginUser = async (userName:string, passwordPlain: string): Promise<CurrentUserSession | null> => {

    const users = getUsersFromDB();
    const user = users.find(u => u.userName.toLowerCase() === userName.toLowerCase());

    if (user) {
        const passwordMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
        if (passwordMatch) {
            currentUserSession = { userId: user.userId, userName: user.userName };
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUserSession));
            
            updateAnalytics('login');
            
            track('user_logged_in', { 
                userId: user.userId,
                userName: userName,
                timestamp: Date.now()
            });

            // Gửi thông tin đăng nhập tới dịch vụ toàn cầu
            trackUserLoginGlobally(user.userId, userName)
                .then(success => {
                    if (success) {
                        console.log(`User '${userName}' login tracking request sent successfully.`);
                    } else {
                        console.error(`Failed to send login tracking request for user '${userName}'.`);
                    }
                });
            
            console.log(`User '${userName}' logged in successfully locally.`);
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

// --- Plan & Usage Management ---
const getValidatedUserAndSave = (userId: string): { user: StoredUser | null; users: StoredUser[]; userIndex: number } => {
    const users = getUsersFromDB();
    const userIndex = users.findIndex(u => u.userId === userId);
    if (userIndex === -1) {
        return { user: null, users, userIndex };
    }
    
    const user = users[userIndex];
    let userWasModified = false;

    // Initialize fields if they don't exist for older user entries
    if (typeof user.totalAudioUsedMs !== 'number') {
      user.totalAudioUsedMs = 0;
      userWasModified = true;
    }
    if (typeof user.lastAudioUsageDate !== 'string') {
      user.lastAudioUsageDate = new Date().toISOString();
      userWasModified = true;
    }

    const lastReset = user.lastAudioUsageDate ? new Date(user.lastAudioUsageDate).getTime() : 0;
    const lastDate = new Date(lastReset);
    const today = new Date();
    
    // Corrected logic for monthly reset
    if (today.getFullYear() > lastDate.getFullYear() || (today.getFullYear() === lastDate.getFullYear() && today.getMonth() > lastDate.getMonth())) {
        console.log(`Monthly usage reset for user ${userId}.`);
        user.totalAudioUsedMs = 0;
        user.lastAudioUsageDate = today.toISOString(); 
        userWasModified = true;
    }

    if (userWasModified) {
      saveUsersToDB(users);
    }
    
    return { user, users, userIndex };
};

export const getCurrentUserPlanTier = (userId: string): PlanTierId => {
    const users = getUsersFromDB();
    const user = users.find(u => u.userId === userId);
    return user?.planType || DEFAULT_PLAN_ID;
};

export const getMonthlyUsageLimitSeconds = (userId: string | null): number => {
    if (!userId) return getUsageLimitSecondsByPlan('guest');
    const planId = getCurrentUserPlanTier(userId);
    return getUsageLimitSecondsByPlan(planId);
};

export const getMonthlyUsedSeconds = (userId: string): number => {
    const { user } = getValidatedUserAndSave(userId);
    return user ? (user.totalAudioUsedMs || 0) / 1000 : 0;
};

export const hasUsageQuotaRemaining = (userId: string): boolean => {
    const usedSeconds = getMonthlyUsedSeconds(userId);
    const limitSeconds = getMonthlyUsageLimitSeconds(userId);
    return usedSeconds < limitSeconds;
};

export const recordAudioUsage = (userId: string, durationSeconds: number) => {
    if (durationSeconds <= 0) return;

    const { user, users, userIndex } = getValidatedUserAndSave(userId);
    if (!user) return;

    user.totalAudioUsedMs = (user.totalAudioUsedMs || 0) + (durationSeconds * 1000);
    // Don't update lastAudioUsageDate here; it's for tracking the reset period.
    users[userIndex] = user;
    saveUsersToDB(users);
    
    window.dispatchEvent(new CustomEvent('updateUsage'));
};


export const updateUserPlan = async (userId: string, planId: PlanTierId): Promise<boolean> => {
    const users = getUsersFromDB();
    const userIndex = users.findIndex(u => u.userId === userId);
    if (userIndex === -1) {
        console.error("updateUserPlan: User not found.");
        return false;
    }
    users[userIndex].planType = planId;
    saveUsersToDB(users);
    console.log(`User ${userId} plan updated to ${planId}`);
    return true;
};


// --- Meeting Session Management ---
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
(() => {
    isAuthenticated(); // Initialize currentUserSession from localStorage if available
    getOrCreateInstallId(); // Ensure install ID exists on load
    // Initialize analytics by fetching it, which also ensures totalUsers is set.
    const initialAnalytics = getAnalyticsData();
    if (!localStorage.getItem(ANALYTICS_KEY)) { // If it was truly first time, save initial state.
        saveAnalyticsData(initialAnalytics);
    }
})();