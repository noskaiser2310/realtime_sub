// src/services/googleSheetsService.ts

/**
 * LƯU Ý VỀ SỬA LỖI:
 * -------------------
 * Lỗi "Multiple exports with the same name" và "The symbol has already been declared"
 * xảy ra khi một hằng số hoặc hàm được định nghĩa và export nhiều hơn một lần trong cùng một file.
 * Điều này thường xảy ra khi sao chép và dán code mới vào một file cũ mà không xóa code cũ đi.
 * * Phiên bản này là phiên bản cuối cùng, đã được làm sạch và chỉ chứa một định nghĩa duy nhất
 * cho mỗi hàm, đảm bảo không còn lỗi trùng lặp.
 *
 * KIẾN TRÚC TỔNG QUAN:
 * ---------------------
 * Dịch vụ này hoạt động theo mô hình phân tách trách nhiệm để bảo mật và đáng tin cậy tối đa:
 *
 * 1. Thao tác GHI (Theo dõi sự kiện):
 * - Tất cả các thao tác ghi (đăng ký, đăng nhập) đều được gửi dưới dạng yêu cầu POST tới một Ứng dụng Web Google Apps Script.
 * - URL của Ứng dụng Web được cung cấp qua `window.__sheets_config.webAppUrl`.
 * - Apps Script hoạt động như một proxy phía máy chủ an toàn, tự xác thực với Google và ghi dữ liệu.
 *
 * 2. Thao tác ĐỌC (Lấy thống kê):
 * - Các thao tác đọc (`getGlobalStats`) vẫn có thể sử dụng Google Sheets API v4 tiêu chuẩn với API Key chỉ đọc.
 * - Điều này yêu cầu Bảng tính Google phải được cài đặt chia sẻ là "Bất kỳ ai có đường liên kết đều có thể xem".
 * - API Key được cung cấp qua `window.__sheets_config.apiKey`.
 */

interface SheetsConfig {
  spreadsheetId: string;
  apiKey: string; // Dành cho thao tác CHỈ ĐỌC
  webAppUrl: string; // Dành cho thao tác GHI thông qua Google Apps Script
}

let SPREADSHEET_ID: string | null = null;
let API_KEY: string | null = null;
let WEB_APP_URL: string | null = null;

/**
 * Tải cấu hình từ đối tượng window toàn cục.
 * Hàm này nên được gọi một lần khi module được khởi tạo.
 */
const loadSheetsConfig = () => {
  if (typeof window !== 'undefined' && (window as any).__sheets_config) {
    const config = (window as any).__sheets_config as SheetsConfig;
    SPREADSHEET_ID = config.spreadsheetId;
    API_KEY = config.apiKey;
    WEB_APP_URL = config.webAppUrl;
    
    console.log("Google Sheets Service Config Loaded:", {
      SPREADSHEET_ID,
      API_KEY: API_KEY && !API_KEY.includes('YOUR') ? 'Loaded' : 'NOT SET',
      WEB_APP_URL: WEB_APP_URL && !WEB_APP_URL.includes('YOUR') ? 'Loaded' : 'NOT SET',
    });
  } else {
    console.warn("Google Sheets config object `__sheets_config` not found on window.");
  }
};
// Khởi tạo cấu hình ngay khi module được tải.
loadSheetsConfig();

/**
 * Gửi dữ liệu sự kiện một cách an toàn đến điểm cuối của Google Apps Script.
 * @param eventType Loại sự kiện ('register' hoặc 'login').
 * @param payload Dữ liệu liên quan đến sự kiện.
 * @returns Một boolean cho biết yêu cầu đã được gửi đi thành công hay chưa.
 */
const postToAppsScript = async (eventType: 'register' | 'login', payload: object): Promise<boolean> => {
  if (!WEB_APP_URL || WEB_APP_URL.includes("YOUR_WEB_APP_URL")) {
    console.warn('Google Apps Script Web App URL is not configured. Skipping event tracking.');
    return false;
  }

  try {
    // Sử dụng `fetch` để gửi yêu cầu POST. Apps Script được thiết kế để xử lý việc này.
    await fetch(WEB_APP_URL, {
      method: 'POST',
      // 'no-cors' là một giải pháp khi gọi Apps Script từ một tên miền khác trong trình duyệt.
      // Nó có nghĩa là chúng ta không thể đọc nội dung phản hồi, nhưng yêu cầu vẫn được gửi đi.
      mode: 'no-cors',
      headers: {
        // Apps Script xử lý postData dạng text/plain tốt hơn.
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        type: eventType,
        payload: payload,
      }),
    });
    
    console.log(`Event tracking request for '${eventType}' was successfully sent to the gateway.`);
    return true;

  } catch (error) {
    console.error(`Network error when sending '${eventType}' event to gateway:`, error);
    return false;
  }
};

// --- Các hàm theo dõi công khai ---

/**
 * Theo dõi một lượt đăng ký người dùng mới bằng cách gửi dữ liệu đến điểm cuối Apps Script an toàn.
 */
export const trackUserRegistration = async (userId: string, username:string, installId: string): Promise<boolean> => {
  const payload = {
    userId,
    username,
    installId,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent.substring(0, 250),
  };
  return postToAppsScript('register', payload);
};

/**
 * Theo dõi một sự kiện đăng nhập của người dùng bằng cách gửi dữ liệu đến điểm cuối Apps Script an toàn.
 */
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
