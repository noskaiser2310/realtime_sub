



import type { PlanTierId } from '../types';

interface SheetsConfig {
  spreadsheetId: string;
  apiKey: string;
  webAppUrl: string;
}

let SPREADSHEET_ID: string | null = null;
let API_KEY: string | null = null;
let WEB_APP_URL: string | null = null;

const loadSheetsConfig = () => {
  if (typeof window !== 'undefined' && (window as any).__sheets_config) {
    const config = (window as any).__sheets_config as SheetsConfig;
    SPREADSHEET_ID = config.spreadsheetId;
    API_KEY = config.apiKey;
    WEB_APP_URL = config.webAppUrl;
  }
};
loadSheetsConfig();

// Hàm gửi dữ liệu đến Google Apps Script
const postToAppsScript = async (eventType: 'register' | 'login' | 'updateUsage', payload: object): Promise<boolean> => {
  if (!WEB_APP_URL || WEB_APP_URL.includes("YOUR_WEB_APP_URL")) {
    console.warn('Google Apps Script Web App URL is not configured.');
    return false;
  }

  try {
    await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        type: eventType,
        payload: payload,
      }),
    });
    
    return true;

  } catch (error) {
    console.error(`Network error when sending event:`, error);
    return false;
  }
};

// Cập nhật hàm trackUserRegistration với 2 trường mới
export const trackUserRegistration = async (
  userId: string, 
  username: string, 
  installId: string,
  plan: PlanTierId = 'guest',
  timeUseSeconds: number = 0
): Promise<boolean> => {
  const payload = {
    userId,
    username,
    installId,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent.substring(0, 250),
    plan,              // Trường mới
    timeUseSeconds     // Trường mới
  };
  return postToAppsScript('register', payload);
};

// Hàm mới: cập nhật thời gian sử dụng
export const trackUsageUpdate = async (
  userId: string, 
  timeUseSeconds: number
): Promise<boolean> => {
  const payload = {
    userId,
    timeUseSeconds
  };
  return postToAppsScript('updateUsage', payload);
};

// Hàm login giữ nguyên
export const trackUserLogin = async (userId: string, username: string): Promise<boolean> => {
  const payload = {
    userId,
    username,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent.substring(0, 250),
  };
  return postToAppsScript('login', payload);
};

/**
 * Lấy và tính toán các số liệu thống kê toàn cầu bằng cách đọc trực tiếp từ một Bảng tính Google công khai.
 * Yêu cầu có API Key CHỈ ĐỌC và bảng tính phải được xem công khai.
 */
export const getGlobalStats = async (): Promise<{ totalUsers: number, totalRegistrations: number, totalLogins: number, lastUpdated: string }> => {
  const fallbackStats = { totalUsers: 0, totalRegistrations: 0, totalLogins: 0, lastUpdated: new Date().toISOString() };

  if (!SPREADSHEET_ID || !API_KEY || SPREADSHEET_ID.includes('YOUR_SPREADSHEET_ID') || API_KEY.includes('YOUR_GOOGLE_SHEETS_API_KEY')) {
    console.warn("Cannot get global stats. Spreadsheet ID or read-only API Key is not configured.");
    return fallbackStats;
  }
  
  try {
    const range = 'Events!A:E'; // Đọc các cột từ A đến E từ trang tính 'Events'
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google Sheets read error:', response.status, errorData);
      return fallbackStats;
    }

    const data = await response.json();
    const events: any[][] = data.values || [];
    
    if (events.length <= 1) { // <=1 để tính cả trường hợp chỉ có dòng tiêu đề
      console.log("No event data found in sheet.");
      return fallbackStats;
    }
    
    // Bỏ qua dòng tiêu đề nếu có
    const headerRowCandidate = events[0];
    const dataStartsWithRow = (headerRowCandidate && typeof headerRowCandidate[1] === 'string' && headerRowCandidate[1].toLowerCase().includes('userid')) ? 1 : 0;
    const dataRows = events.slice(dataStartsWithRow);

    if (dataRows.length === 0) {
      return fallbackStats;
    }

    // Lọc và tính toán
    const registrations = dataRows.filter(row => row && row[2] === 'register');
    const logins = dataRows.filter(row => row && row[2] === 'login');
    // Đếm người dùng duy nhất dựa trên các lượt đăng ký
    const uniqueUsers = new Set(registrations.map(row => row[1]));

    return {
      totalUsers: uniqueUsers.size,
      totalRegistrations: registrations.length,
      totalLogins: logins.length,
      lastUpdated: new Date().toISOString(), // Thời gian cập nhật là lúc hàm này chạy
    };
  } catch (error) {
    console.error('Error fetching or processing global stats:', error);
    return fallbackStats;
  }
};
