import React, { useEffect } from 'react';
import type { RouteType, ThemeType } from '../types';

interface HomePageProps {
  navigateTo: (route: RouteType | 'login' | 'register', replace?: boolean, options?: any) => void;
  theme: ThemeType; // Current app theme, though homepage is primarily light
}

// Re-declare Lucide type for window object if not globally available in TS
declare global {
  interface Window {
    lucide?: { // Made lucide optional to match App.tsx
      createIcons: () => void;
    };
  }
}

const HomePage: React.FC<HomePageProps> = ({ navigateTo, theme }) => {
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
    // Update footer year
    const footerText = document.querySelector('#homepage-footer-text');
    if (footerText) {
      footerText.textContent = `© ${new Date().getFullYear()} Trợ Lý AI. Mọi quyền được bảo lưu.`;
    }
  }, []);

  const handleVideoPlaceholderClick = () => {
    alert('Video player placeholder: Integrate your video here!');
  };
  
  const handleEnterpriseContactClick = () => {
    alert('Vui lòng liên hệ đội ngũ bán hàng của chúng tôi để biết giải pháp cho doanh nghiệp.');
  };


  return (
    <div id="homepage-section-react" className={`font-['Inter',_sans-serif] ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-gray-800'}`}>
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 ${theme === 'dark' ? 'bg-slate-800/80 text-slate-200' : 'bg-white/80 text-gray-700'} backdrop-blur-md shadow-sm z-50`}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-sky-400' : 'gradient-text'}`}>Trợ Lý AI</div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className={`${theme === 'dark' ? 'hover:text-sky-300' : 'hover:text-blue-600'} font-medium`}>Tính Năng</a>
            <a href="#demo-video" className={`${theme === 'dark' ? 'hover:text-sky-300' : 'hover:text-blue-600'} font-medium`}>Xem Demo</a>
            <a href="#pricing" className={`${theme === 'dark' ? 'hover:text-sky-300' : 'hover:text-blue-600'} font-medium`}>Bảng Giá</a>
          </nav>
          <div>
            <button onClick={() => navigateTo('login')} className={`hidden md:inline-block font-semibold mr-4 ${theme === 'dark' ? 'hover:text-sky-300' : 'hover:text-blue-600'} transition-colors`}>Đăng Nhập</button>
            <button onClick={() => navigateTo('register')} className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg shadow-lg hover:bg-blue-700 transition-all">
              Dùng Thử Miễn Phí
            </button>
          </div>
        </div>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className={`text-center py-20 lg:py-32 px-6 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gradient-to-b from-gray-50 to-gray-100'}`}>
          <div className="container mx-auto">
            <h1 className={`text-4xl md:text-6xl font-extrabold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'} leading-tight`}>
              Giải Phóng Bạn Khỏi Việc Ghi Chép,
              <br />
              <span className={`${theme === 'dark' ? 'text-sky-400' : 'gradient-text'}`}>Tập Trung Vào Điều Quan Trọng</span>
            </h1>
            <p className={`mt-6 text-lg md:text-xl ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} max-w-3xl mx-auto`}>
              Trợ lý AI tự động ghi âm, phiên âm, dịch và tóm tắt mọi cuộc họp. Giúp bạn không bao giờ bỏ lỡ bất kỳ thông tin quan trọng nào.
            </p>
            <div className="mt-10">
              <button onClick={() => navigateTo('register')} className="bg-blue-600 text-white font-bold px-8 py-4 rounded-lg shadow-xl hover:bg-blue-700 transform hover:scale-105 transition-all">
                Bắt Đầu Miễn Phí Ngay
              </button>
            </div>
          </div>
        </section>

        {/* Features Section (MOVED UP) */}
        <section id="features" className={`py-20 px-6 ${theme === 'dark' ? 'bg-slate-850' : 'bg-gray-100'}`}>
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-3xl md:text-4xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>Mọi thứ bạn cần cho một cuộc họp hiệu quả</h2>
              <p className={`mt-4 text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} max-w-2xl mx-auto`}>Nền tảng tất cả trong một giúp bạn tiết kiệm thời gian và công sức, tập trung vào nội dung chính.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-white'} p-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300`}>
                <i data-lucide="mic" className={`w-10 h-10 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'} mb-4`}></i>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Phiên Âm Chính Xác</h3>
                <p className={`mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Chuyển đổi giọng nói thành văn bản với độ chính xác cao, hỗ trợ nhiều ngôn ngữ và ngữ cảnh.</p>
              </div>
              <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-white'} p-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300`}>
                <i data-lucide="languages" className={`w-10 h-10 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'} mb-4`}></i>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Dịch Thuật Tức Thời</h3>
                <p className={`mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>Phá bỏ rào cản ngôn ngữ với tính năng dịch trực tiếp sang hơn 50 ngôn ngữ phổ biến.</p>
              </div>
              <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-white'} p-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300`}>
                <i data-lucide="file-text" className={`w-10 h-10 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'} mb-4`}></i>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Tóm Tắt Thông Minh</h3>
                <p className={`mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>AI tự động tạo tóm tắt, rút ra các điểm chính và các mục cần hành động cụ thể.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Video Demo Section */}
        <section id="demo-video" className={`py-20 px-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className={`text-3xl md:text-4xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>Xem Trợ Lý AI hoạt động</h2>
              <p className={`mt-4 text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} max-w-2xl mx-auto`}>Trải nghiệm sức mạnh của AI trong việc biến đổi các cuộc họp của bạn chỉ trong vài phút.</p>
            </div>
            <div className="max-w-4xl mx-auto">
              <div 
                className={`aspect-video ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-900'} rounded-2xl shadow-2xl overflow-hidden relative group video-thumbnail cursor-pointer`} 
                onClick={handleVideoPlaceholderClick}
              >
                <img src={`https://placehold.co/1280x720/${theme === 'dark' ? '1e293b' : '1f2937'}/ffffff?text=Video+Demo+AI`} alt="Video demo sản phẩm Trợ Lý AI" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className={`bg-white/90 ${theme === 'dark' ? 'text-sky-500' : 'text-blue-600'} p-5 rounded-full shadow-xl transform group-hover:scale-110 transition-transform`}>
                    <i data-lucide="play" className={`w-10 h-10 ${theme === 'dark' ? 'fill-sky-500' : 'fill-blue-600'} ml-1`}></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section (NEW) */}
        <section id="testimonials" className={`py-20 px-6 ${theme === 'dark' ? 'bg-slate-850' : 'bg-gray-50'}`}>
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <h2 className={`text-3xl md:text-4xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>Khách hàng nói gì?</h2>
              <p className={`mt-4 text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} max-w-2xl mx-auto`}>Xem cách Trợ Lý AI đã thay đổi cách họ làm việc và quản lý cuộc họp.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Testimonial Card 1 (Placeholder) */}
              <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-white'} p-8 rounded-xl shadow-lg`}>
                <i data-lucide="quote" className={`w-10 h-10 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'} mb-4 opacity-50`}></i>
                <p className={`italic ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-4`}>"Ứng dụng này đã tiết kiệm cho tôi hàng giờ đồng hồ mỗi tuần! Việc tóm tắt tự động thật tuyệt vời."</p>
                <p className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Nguyễn Văn A</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Trưởng phòng Marketing</p>
              </div>
              {/* Testimonial Card 2 (Placeholder) */}
              <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-white'} p-8 rounded-xl shadow-lg`}>
                <i data-lucide="quote" className={`w-10 h-10 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'} mb-4 opacity-50`}></i>
                <p className={`italic ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-4`}>"Khả năng phiên âm và dịch thuật chính xác giúp đội nhóm đa quốc gia của chúng tôi làm việc hiệu quả hơn hẳn."</p>
                <p className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Trần Thị B</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Giám đốc Dự án</p>
              </div>
              {/* Testimonial Card 3 (Placeholder) */}
              <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-white'} p-8 rounded-xl shadow-lg`}>
                <i data-lucide="quote" className={`w-10 h-10 ${theme === 'dark' ? 'text-sky-400' : 'text-blue-600'} mb-4 opacity-50`}></i>
                <p className={`italic ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-4`}>"Tính năng Hỏi & Đáp dựa trên nội dung phiên âm thực sự là một cứu cánh để nhanh chóng tìm lại thông tin."</p>
                <p className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Lê Văn C</p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Chuyên viên Phân tích</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Pricing Section */}
        <section id="pricing" className={`py-20 px-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
          <div className="container mx-auto">
             <div className="text-center mb-16">
              <h2 className={`text-3xl md:text-4xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>Bảng giá đơn giản, minh bạch</h2>
              <p className={`mt-4 text-lg ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} max-w-2xl mx-auto`}>Chọn gói phù hợp nhất với nhu cầu và quy mô đội nhóm của bạn.</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className={`border ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} rounded-xl p-8 hover:shadow-lg transition-shadow`}>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Cá Nhân</h3>
                <p className={`text-4xl font-extrabold mt-4 ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>$10<span className={`text-lg font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>/tháng</span></p>
                <ul className={`mt-6 space-y-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                  <li className="flex items-center"><i data-lucide="check-circle-2" className="w-5 h-5 text-green-500 mr-2"></i> 600 phút phiên âm/tháng</li>
                  <li className="flex items-center"><i data-lucide="check-circle-2" className="w-5 h-5 text-green-500 mr-2"></i> Tóm tắt & Phân tích AI</li>
                  <li className="flex items-center"><i data-lucide="check-circle-2" className="w-5 h-5 text-green-500 mr-2"></i> Xuất file đa dạng</li>
                </ul>
                <button onClick={() => navigateTo('register')} className={`block w-full text-center mt-8 ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-slate-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} font-semibold py-3 rounded-lg transition-colors`}>Bắt đầu</button>
              </div>
              <div className={`border-2 border-blue-600 rounded-xl p-8 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} shadow-2xl relative`}>
                <p className="absolute top-0 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">Phổ biến nhất</p>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Đội Nhóm</h3>
                <p className={`text-4xl font-extrabold mt-4 ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>$25<span className={`text-lg font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>/người/tháng</span></p>
                <ul className={`mt-6 space-y-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                  <li className="flex items-center"><i data-lucide="check-circle-2" className="w-5 h-5 text-green-500 mr-2"></i> Mọi thứ trong gói Cá Nhân</li>
                  <li className="flex items-center"><i data-lucide="check-circle-2" className="w-5 h-5 text-green-500 mr-2"></i> Không gian làm việc chung</li>
                  <li className="flex items-center"><i data-lucide="check-circle-2" className="w-5 h-5 text-green-500 mr-2"></i> Tích hợp Google Meet, Zoom</li>
                </ul>
                <button onClick={() => navigateTo('register')} className="block w-full text-center mt-8 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors">Chọn Gói Team</button>
              </div>
              <div className={`border ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} rounded-xl p-8 hover:shadow-lg transition-shadow`}>
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>Doanh Nghiệp</h3>
                <p className={`text-4xl font-extrabold mt-4 ${theme === 'dark' ? 'text-slate-100' : 'text-gray-900'}`}>Liên Hệ</p>
                <ul className={`mt-6 space-y-4 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                  <li className="flex items-center"><i data-lucide="check-circle-2" className="w-5 h-5 text-green-500 mr-2"></i> Mọi thứ trong gói Đội Nhóm</li>
                  <li className="flex items-center"><i data-lucide="check-circle-2" className="w-5 h-5 text-green-500 mr-2"></i> Bảo mật nâng cao (SSO)</li>
                  <li className="flex items-center"><i data-lucide="check-circle-2" className="w-5 h-5 text-green-500 mr-2"></i> Hỗ trợ chuyên biệt</li>
                </ul>
                <button onClick={handleEnterpriseContactClick} className={`w-full mt-8 ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-slate-100' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} font-semibold py-3 rounded-lg transition-colors`}>Liên Hệ Sales</button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-800'} text-white`}>
          <div className="container mx-auto px-6 py-12 text-center">
              <p id="homepage-footer-text">&copy; {new Date().getFullYear()} Trợ Lý AI. Mọi quyền được bảo lưu.</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default HomePage;
