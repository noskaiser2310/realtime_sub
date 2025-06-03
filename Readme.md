# Trợ lý Cuộc họp Thời gian Thực (v5 - Cập nhật Xác thực & Cài đặt)

## 1. Giới thiệu

Chào mừng bạn đến với Trợ lý Cuộc họp Thời gian Thực! Ứng dụng này giúp bạn ghi âm, phiên âm, dịch thuật, tóm tắt và tương tác với âm thanh từ các cuộc họp hoặc tab trình duyệt của bạn trong thời gian thực. Nó sử dụng Google Gemini AI để cung cấp các tính năng mạnh mẽ này trực tiếp trong trình duyệt của bạn.

**Tính năng mới trong phiên bản này (v5):**
*   **Xác thực Người dùng:** Triển khai chức năng đăng ký và đăng nhập người dùng (mô phỏng bằng `localStorage`).
*   **Định tuyến Ứng dụng:** Sử dụng URL hash để điều hướng giữa các trang Đăng nhập, Đăng ký, Chính và Cài đặt.
*   **Quản lý Cài đặt:** Cho phép người dùng tùy chỉnh cài đặt ứng dụng (ví dụ: giao diện, ngôn ngữ mặc định), được lưu trữ cho mỗi người dùng.
*   **Cấu trúc Module hóa:** Giao diện trợ lý cuộc họp cốt lõi hiện nằm trong thành phần `MainPage`, tách biệt với bộ điều phối `App` chính.
*   **Thông báo Toast:** Cải thiện phản hồi người dùng thông qua các thông báo toast.
*   **Tùy chỉnh Giao diện:** Hỗ trợ giao diện sáng/tối cơ bản.

## 2. Tính năng chính

*   **Xác thực Người dùng:**
    *   Đăng ký người dùng mới (tên người dùng/mật khẩu).
    *   Đăng nhập người dùng hiện tại.
    *   Phiên người dùng được quản lý (mô phỏng, phía máy khách).
*   **Định tuyến Ứng dụng:**
    *   `/#/login`: Trang đăng nhập người dùng.
    *   `/#/register`: Trang đăng ký người dùng.
    *   `/#/main`: Giao diện trợ lý cuộc họp cốt lõi (yêu cầu đăng nhập).
    *   `/#/settings`: Trang cài đặt ứng dụng dành riêng cho người dùng (yêu cầu đăng nhập).
*   **Ghi âm Thời gian Thực:** Thu âm thanh từ micro và hệ thống/tab.
*   **Phiên âm Trực tiếp (STT) & Dịch thuật:** Sử dụng Gemini API.
*   **Phát lại Giọng nói (TTS):** Cho văn bản đã dịch.
*   **Tóm tắt AI & Hỏi đáp Tương tác:** Được cung cấp bởi Gemini API.
*   **Xuất Dữ liệu:** Tải xuống bản ghi, bản dịch, tóm tắt và âm thanh.
*   **Quản lý Phiên họp:**
    *   "Lưu" dữ liệu cuộc họp hiện tại (bản ghi, bản dịch, tóm tắt, âm thanh) vào danh sách liên kết với người dùng đã đăng nhập.
    *   "Tải" một phiên họp đã lưu trước đó.
*   **Chỉnh sửa Bản ghi.**
*   **Cài đặt Tùy chỉnh:**
    *   Giao diện (Sáng/Tối).
    *   Ngôn ngữ nguồn và đích mặc định.
*   **Chỉ báo Âm lượng Micro & Giao diện Người dùng Thích ứng.**

## 3. Điều kiện tiên quyết

*   Trình duyệt Web Hiện đại (Chrome, Edge, Firefox, Safari).
*   Kết nối Internet.
*   Microphone.
*   Khả năng Chia sẻ Âm thanh Tab/Màn hình.

## 4. Thiết lập: API Key cho Google Gemini

Ứng dụng này yêu cầu một API key của Google Gemini.

1.  **Lấy API Key:** Từ Google AI Studio: [https://ai.google.dev/](https://ai.google.dev/)
2.  **Đặt Biến Môi trường:** API key **phải** có sẵn dưới dạng biến môi trường `process.env.API_KEY`.
    *   Điều này cần được cấu hình trong môi trường nơi JavaScript của ứng dụng được thực thi.
    *   **Mã ứng dụng đọc trực tiếp `process.env.API_KEY`. Không có giao diện người dùng để nhập key.**


## 5. Chạy ứng dụng

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 6. Cách sử dụng ứng dụng

### 6.1. Xác thực người dùng
1.  **Đăng ký:**
    *   Điều hướng đến `/#/register` (hoặc nhấp vào "Đăng ký ngay" từ trang đăng nhập).
    *   Nhập tên người dùng (tối thiểu 3 ký tự), mật khẩu (tối thiểu 6 ký tự) và xác nhận mật khẩu.
    *   Nhấp vào "Đăng ký". Nếu thành công, bạn sẽ tự động đăng nhập và được chuyển hướng đến ứng dụng chính.
2.  **Đăng nhập:**
    *   Điều hướng đến `/#/login`.
    *   Nhập tên người dùng và mật khẩu đã đăng ký của bạn.
    *   Nhấp vào "Đăng nhập". Nếu thành công, bạn sẽ được chuyển hướng đến ứng dụng chính (`/#/main`).
3.  **Đăng xuất:**
    *   Trên trang ứng dụng chính, nhấp vào nút "Đăng xuất" ở đầu trang. Bạn sẽ được chuyển hướng đến trang đăng nhập.

### 6.2. Ứng dụng chính (`/#/main`)
*(Truy cập sau khi đăng nhập)*
Trang này chứa các tính năng cốt lõi của trợ lý cuộc họp:
*   **Tiêu đề (Header):** Hiển thị tên người dùng của bạn, nút cài đặt và nút đăng xuất.
*   **Điều khiển Âm thanh:** Chọn ngôn ngữ, bắt đầu/dừng ghi âm.
*   **Phiên âm & Dịch thuật:** Văn bản trực tiếp xuất hiện ở đây.
*   **Tóm tắt & Chatbot Hỏi đáp.**
*   **Tải xuống & Quản lý Phiên họp.**
    *   Các phiên họp hiện được lưu và liệt kê cho mỗi người dùng đã đăng nhập.

### 6.3. Cài đặt (`/#/settings`)
*(Truy cập sau khi đăng nhập)*
1.  Nhấp vào **biểu tượng Cài đặt** (hình bánh răng) ở tiêu đề của trang ứng dụng chính.
2.  **Tùy chỉnh:**
    *   **Giao diện (Theme):** Chọn giữa "Sáng (Light)" và "Tối (Dark)".
    *   **Ngôn ngữ gốc mặc định:** Ngôn ngữ mặc định cho phiên âm.
    *   **Ngôn ngữ đích mặc định:** Ngôn ngữ mặc định cho dịch thuật.
3.  Nhấp vào "Lưu thay đổi" để áp dụng và quay lại ứng dụng chính. Các thay đổi được lưu vào `localStorage` của trình duyệt cho hồ sơ người dùng của bạn.

### 6.4. Các tính năng khác
*   **Bắt đầu/Dừng ghi âm:** Thu âm thanh từ micro và tab/hệ thống.
*   **Chỉ báo âm lượng micro:** Theo dõi mức độ đầu vào của micro.
*   **Phiên âm trực tiếp:** Văn bản được tạo ra từ giọng nói.
*   **Dịch thuật trực tiếp:** Bản dịch của văn bản phiên âm.
*   **Phát lại TTS:** Nghe bản dịch (nếu trình duyệt hỗ trợ ngôn ngữ).
*   **Tóm tắt:** Tạo điểm chính và mục hành động từ bản ghi.
*   **Chatbot Hỏi đáp:** Đặt câu hỏi về nội dung cuộc họp.
*   **Lưu/Tải phiên:** Quản lý các bản ghi cuộc họp đã lưu.
*   **Tải xuống dữ liệu:** Lưu bản ghi, bản dịch, tóm tắt, và file âm thanh.
*   **Chỉnh sửa bản ghi:** Sửa đổi văn bản đã phiên âm.

## 7. Tổng quan kiến trúc

Ứng dụng này là một **Ứng dụng Trang Đơn (SPA)** phía máy khách. Tất cả logic, bao gồm tương tác với các API bên ngoài, đều chạy trong trình duyệt của người dùng.

*   **`App.tsx`:** Thành phần gốc. Quản lý vòng đời ứng dụng (khởi tạo, trạng thái xác thực), định tuyến, trạng thái toàn cục (người dùng hiện tại, cài đặt ứng dụng), và thông báo toast. Kết xuất các thành phần trang phù hợp.
*   **Thành phần Trang (Page Components):**
    *   **`LoginPage.tsx`**: Xử lý đăng nhập người dùng.
    *   **`RegisterPage.tsx`**: Xử lý đăng ký người dùng.
    *   **`MainPage.tsx`**: Giao diện trợ lý cuộc họp cốt lõi, có thể truy cập sau khi đăng nhập. Chứa hầu hết các chức năng liên quan đến cuộc họp của `App.tsx` trước đây.
    *   **`SettingsPage.tsx`**: Cho phép người dùng cấu hình cài đặt ứng dụng.
*   **Dịch vụ (`./services/`)**:
    *   **`sessionService.ts`**: Quản lý xác thực người dùng (đăng ký, đăng nhập, đăng xuất, phiên người dùng hiện tại) và dữ liệu phiên họp (hoạt động CRUD cho các cuộc họp đã lưu, giới hạn cho người dùng đã đăng nhập).
    *   **`settingsService.ts`**: Quản lý cài đặt ứng dụng (giao diện, ngôn ngữ), lưu trữ chúng trong `localStorage` cho mỗi người dùng (hoặc khách).
    *   **`audioService.ts`**: Quản lý đầu vào âm thanh, trộn nguồn, phân đoạn âm thanh và giao tiếp với `sttService` để phiên âm.
    *   **`sttService.ts`**: Chuyển đổi dữ liệu âm thanh thành văn bản bằng Gemini API.
    *   **`geminiService.ts`**: Xử lý tất cả các tương tác dựa trên văn bản với Gemini API (dịch thuật, tóm tắt, Q&A).
    *   **`ttsService.ts`**: Quản lý API `SpeechSynthesis` của trình duyệt để phát lại văn bản thành giọng nói.
*   **Thành phần Giao diện Người dùng (`./components/`)**: Các yếu tố giao diện người dùng có thể tái sử dụng.
    *   **`Toast.tsx`**: Hiển thị các thông báo ngắn.
*   **Tạo kiểu (Styling):** Tailwind CSS (thông qua CDN).
*   **"Băm" Mật khẩu:** `bcryptjs` được sử dụng phía máy khách cho mục đích demo (rất không an toàn cho sản xuất).

## 8. Cấu trúc dự án (Đơn giản hóa)

```
/
├── index.html                  # Điểm vào HTML chính
├── index.tsx                   # Bootstrap ứng dụng React chính
├── App.tsx                     # Thành phần React gốc (định tuyến, trạng thái xác thực)
├── LoginPage.tsx               # Trang đăng nhập
├── RegisterPage.tsx            # Trang đăng ký
├── MainPage.tsx                # Giao diện trợ lý cuộc họp cốt lõi
├── SettingsPage.tsx            # Trang cài đặt
├── components/
│   ├── Toast.tsx               # Component thông báo toast
│   └── ... (các thành phần khác hiện có)
├── services/
│   ├── sessionService.ts       # Xác thực người dùng & dữ liệu phiên họp
│   ├── settingsService.ts      # Quản lý cài đặt ứng dụng
│   └── ... (các dịch vụ khác hiện có)
├── constants.ts                # Hằng số toàn ứng dụng
├── LoadingSpinner.tsx          # Component vòng xoay tải
├── types.ts                    # Định nghĩa kiểu TypeScript
├── metadata.json               # Siêu dữ liệu ứng dụng
└── Readme.md                   # Tập tin này
```

## 9. Công nghệ chính

*   React 19, TypeScript, Tailwind CSS
*   Google Gemini API (`@google/genai` SDK)
*   `bcryptjs` (dùng cho demo băm mật khẩu)
*   API Trình duyệt (WebRTC, Web Audio, MediaRecorder, SpeechSynthesis, `localStorage`)

## 10. Các cải tiến trong tương lai (Điểm nổi bật cho triển khai đầy đủ)

*   **Backend An toàn:** Cần thiết cho việc xác thực người dùng đúng cách (OAuth, băm mật khẩu an toàn), quản lý API key, và lưu trữ dữ liệu liên tục (phiên họp, hồ sơ người dùng, cài đặt) trong cơ sở dữ liệu.
*   **Phiên Người dùng Thực:** Quản lý phiên phía máy chủ (ví dụ: JWTs, cookies).
*   Và các cải tiến khác đã đề cập trong README của phiên bản trước.



