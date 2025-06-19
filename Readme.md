# SmartM AI (v6 - Website & Dashboard Interface)

## 1. Giới thiệu

Chào mừng bạn đến với phiên bản mới của SmartM AI! Ứng dụng này đã được tái cấu trúc thành một website hoàn chỉnh với trang chủ (landing page) giới thiệu chuyên nghiệp và một bảng điều khiển (dashboard) mạnh mẽ, nơi các tính năng cốt lõi như ghi âm, phiên âm, dịch thuật, tóm tắt và tương tác AI với nội dung cuộc họp được thực hiện.

**Thay đổi chính trong phiên bản này (v6):**
*   **Giao diện Website:** Một trang chủ tĩnh (HTML/CSS/JS) được thêm vào, cung cấp thông tin về sản phẩm, video demo (placeholder), các tính năng và bảng giá (mẫu).
*   **Bảng Điều Khiển (Dashboard):** Ứng dụng React hiện tại được tích hợp làm bảng điều khiển chính, nơi người dùng đăng nhập/đăng ký và sử dụng các công cụ trợ lý cuộc họp.
*   **Luồng Điều Hướng Mới:** Người dùng bắt đầu từ trang chủ và có thể điều hướng đến bảng điều khiển để sử dụng các tính năng. Các nút "Đăng Nhập", "Dùng Thử Miễn Phí" trên trang chủ sẽ dẫn đến bảng điều khiển.
*   **Tái sử dụng Toàn bộ Logic Hiện có:** Tất cả các dịch vụ (âm thanh, Gemini, STT, TTS, session, settings) và các thành phần React cốt lõi (`MainPage`, `LoginPage`, `RegisterPage`, `SettingsPage`) được giữ nguyên và hoạt động bên trong bảng điều khiển.
*   **Thiết kế lại `MainPage`:** Giao diện chính của trợ lý cuộc họp được thiết kế lại đáng kể với:
    *   **Thanh Điều Khiển Trên Cùng (Top Controls Bar):** Chứa các lựa chọn ngôn ngữ, đồng hồ bấm giờ và các nút điều khiển ghi âm chính.
    *   **Bố cục Hai Cột:**
        *   **Cột Trái (Nội dung chính):** Hiển thị thẻ Phiên âm và thẻ Bản dịch theo chiều dọc.
        *   **Cột Phải (Bảng Hành Động - Action Panel):** Một giao diện theo tab cho các tính năng "Tóm Tắt" (hiển thị Điểm Chính), "Mục Hành Động", và "Hỏi & Đáp" (Chatbot).
    *   Các khu vực Tải xuống và Phiên đã lưu được bố trí gọn gàng bên dưới Bảng Hành Động.

Ứng dụng vẫn sử dụng React, TypeScript, Tailwind CSS, và Google Gemini API để cung cấp trải nghiệm trợ lý cuộc họp mạnh mẽ.

## 2. Tính năng chính

### 2.1. Trang chủ
*   Giới thiệu tổng quan về sản phẩm.
*   Phần demo video (hiện tại là placeholder).
*   Liệt kê các tính năng nổi bật.
*   Thông tin bảng giá mẫu.
*   Các nút kêu gọi hành động (Call to Action) để đăng nhập hoặc đăng ký (dẫn đến bảng điều khiển).

### 2.2. Bảng điều khiển (Ứng dụng React)
*   **Xác thực Người dùng:** Đăng ký, đăng nhập, đăng xuất.
*   **Giao diện Trợ lý Cuộc họp (`MainPage` - được thiết kế lại):**
    *   Thanh điều khiển trên cùng tiện lợi cho việc chọn ngôn ngữ và quản lý ghi âm.
    *   Hiển thị rõ ràng Phiên âm và Bản dịch.
    *   Bảng Hành Động (Action Panel) với các tab Tóm Tắt (Key Points), Mục Hành Động, và Hỏi & Đáp (Chatbot).
    *   Ghi âm thời gian thực từ micro và hệ thống/tab.
    *   Phiên âm trực tiếp (STT) & Dịch thuật (Gemini API).
    *   Phát lại Giọng nói (TTS) cho văn bản đã dịch.
    *   Xuất dữ liệu (bản ghi, dịch, tóm tắt, âm thanh, PDF tổng hợp).
    *   Quản lý phiên họp đã lưu (lưu/tải/xóa).
    *   Chỉnh sửa bản ghi.
*   **Trang Cài đặt (`SettingsPage`):** Tùy chỉnh giao diện (sáng/tối), ngôn ngữ mặc định.
*   **Giao diện Người dùng Thích ứng.**

## 3. Điều kiện tiên quyết

*   Trình duyệt Web Hiện đại (Chrome, Edge, Firefox, Safari).
*   Kết nối Internet.
*   Microphone.
*   Khả năng Chia sẻ Âm thanh Tab/Màn hình (cho tính năng ghi âm tab).

## 4. Thiết lập: API Key cho Google Gemini

Ứng dụng này yêu cầu một API key của Google Gemini.

1.  **Lấy API Key:** Từ Google AI Studio: [https://ai.google.dev/](https://ai.google.dev/)
2.  **Đặt Biến Môi trường:** API key **phải** có sẵn dưới dạng biến môi trường `process.env.API_KEY`.
    *   Điều này cần được cấu hình trong môi trường nơi JavaScript của ứng dụng được thực thi.
    *   **Mã ứng dụng đọc trực tiếp `process.env.API_KEY`. Không có giao diện người dùng để nhập key.**

**Lưu ý Bảo mật Quan trọng:** Việc để lộ API key ở phía máy khách là không an toàn cho môi trường sản xuất. Đây là một bản demo; các ứng dụng sản xuất cần một backend để quản lý API key. Mật khẩu cũng được "băm" ở phía máy khách cho bản demo này, điều này không anторы. Các ứng dụng thực tế phải băm mật khẩu ở phía máy chủ.

## 5. Chạy ứng dụng

1.  **Phục vụ các Tệp:**
    *   Sử dụng một máy chủ web cục bộ. Mở trực tiếp `index.html` (`file:///...`) có thể sẽ không hoạt động do các hạn chế bảo mật của trình duyệt đối với các module JavaScript và truy cập API.
    *   Ví dụ (sử dụng `serve`):
        1.  `npm install -g serve` (nếu chưa cài đặt).
        2.  Điều hướng đến thư mục gốc của dự án trong terminal của bạn.
        3.  Chạy: `serve -p 3000`.
2.  **Mở trong Trình duyệt:**
    *   Truy cập `http://localhost:3000`. Bạn sẽ thấy trang chủ mới.

## 6. Cách sử dụng ứng dụng

### 6.1. Từ Trang chủ
1.  Khám phá thông tin về sản phẩm, tính năng, demo, và giá.
2.  Nhấp vào "Đăng Nhập" hoặc "Dùng Thử Miễn Phí" / "Bắt Đầu Miễn Phí Ngay". Thao tác này sẽ ẩn trang chủ và hiển thị bảng điều khiển.
    *   Nếu bạn chưa đăng nhập, ứng dụng React bên trong bảng điều khiển sẽ tự động điều hướng đến trang Đăng nhập hoặc Đăng ký.
    *   Nếu bạn đã đăng nhập trước đó, bạn sẽ được đưa thẳng vào giao diện trợ lý cuộc họp chính.

### 6.2. Bên trong Bảng Điều Khiển
*   **Đăng nhập/Đăng ký:** Sử dụng các trang `LoginPage` và `RegisterPage`.
*   **Giao diện Trợ lý Cuộc họp Chính (`MainPage`):**
    *   Sử dụng thanh điều khiển trên cùng để chọn ngôn ngữ và bắt đầu/dừng ghi âm.
    *   Theo dõi phiên âm và bản dịch trong các thẻ nội dung chính.
    *   Sử dụng Bảng Hành Động bên phải để tạo tóm tắt, xem mục hành động, hoặc tương tác với chatbot.
    *   Lưu phiên họp hiện tại hoặc tải các phiên đã lưu từ thẻ "Phiên đã lưu".
    *   Tải xuống các phần dữ liệu hoặc báo cáo PDF tổng hợp từ thẻ "Tải xuống".
*   **Lịch Sử Họp:** Nút này trên sidebar cũng sẽ điều hướng bạn đến `MainPage`, nơi danh sách các phiên đã lưu được hiển thị.
*   **Cài Đặt:** Nhấp vào biểu tượng "Cài Đặt" trên sidebar để truy cập `SettingsPage`.
*   **Đăng Xuất:** Nhấp vào "Đăng Xuất" trên sidebar.
*   **Về Trang Chủ:** Nhấp vào "Về Trang Chủ" trên sidebar.

## 7. Tổng quan kiến trúc

Ứng dụng kết hợp một trang chủ tĩnh và một bảng điều khiển động (SPA).

*   **`index.html`**: HTML cho trang chủ & khung dashboard.
*   **Ứng dụng React (`App.tsx` và các thành phần con):**
    *   **`App.tsx`**: Thành phần gốc của dashboard, quản lý xác thực, định tuyến nội bộ dashboard.
    *   **`MainPage.tsx`**: Giao diện chính được thiết kế lại, tổ chức các tính năng thành bố cục mới.
    *   **Thành phần Trang (`LoginPage`, `RegisterPage`, `SettingsPage`):** Hoạt động như trước.
    *   **Dịch vụ (`./services/`)**: Không thay đổi.
*   **Tạo kiểu (Styling):** Tailwind CSS.

## 8. Cấu trúc dự án (Đơn giản hóa)

```
/
├── index.html                  # HTML cho trang chủ & khung dashboard, nạp React app
├── index.tsx                   # Bootstrap ứng dụng React (cho dashboard)
├── App.tsx                     # Thành phần React gốc cho dashboard
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── MainPage.tsx            # Giao diện trợ lý cuộc họp chính (React - ĐƯỢC THIẾT KẾ LẠI)
│   ├── SettingsPage.tsx
├── components/
│   └── ... (các thành phần React, một số có thể được thêm/sửa đổi cho MainPage mới)
├── services/
│   └── ... (các dịch vụ hiện có)
├── constants.ts
├── LoadingSpinner.tsx
├── types.ts
├── metadata.json
└── Readme.md                   # Tập tin này
```

## 9. Công nghệ chính

*   HTML, CSS, JavaScript
*   React 19, TypeScript
*   Tailwind CSS
*   Lucide Icons
*   Google Gemini API (`@google/genai` SDK)
*   `bcryptjs`
*   API Trình duyệt (WebRTC, Web Audio, MediaRecorder, SpeechSynthesis, `localStorage`)
*   `@react-pdf/renderer` (để tạo PDF)

## 10. Các cải tiến trong tương lai

*   **Backend An toàn.**
*   **Video Demo Thực Tế.**
*   **Hoàn thiện Bảng Giá.**
*   **Lưu trữ Dữ liệu Bền Vững (Backend).**
*   **Cải thiện Speaker Diarization và Timestamping** (nếu Gemini API hỗ trợ tốt hơn).
*   Và các cải tiến khác đã đề cập trong README của phiên bản trước.

## 11. Thông tin liên hệ

📌 **SmartM AI** – an advanced artificial intelligence tool with the ability to directly interpret and summarize multilingual meeting content.

▫️ **Representative:** Pham Hai Nam - **Phone:** 0346077257
▫️ **SmartM AI Website:** [https://realtime-sub.vercel.app/#/main](https://realtime-sub.vercel.app/#/main)

---
_Hướng dẫn này phản ánh cấu trúc và tính năng của ứng dụng sau bản cập nhật v6, tập trung vào việc tích hợp ứng dụng React hiện tại vào một cấu trúc website hoàn chỉnh hơn và thiết kế lại giao diện MainPage. Tên sản phẩm đã được cập nhật thành SmartM AI._