import React, { useState } from 'react';
import * as sessionService from '../services/sessionService';
import { LoadingSpinner } from '../LoadingSpinner';
import { UserPlusIcon as PageUserPlusIcon, UserCircleIcon as PageUserCircleIcon } from '../components/icons/FeatureIcons'; // Renamed to avoid conflict

interface RegisterPageProps {
  onAuthSuccess: (userName: string, userId: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  navigateTo: (route: 'login') => void;
}

const InputField = React.memo(({ id, type, value, onChange, placeholder, label, icon, 'aria-describedby': ariaDescribedby }: { id: string, type: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string, label: string, icon: React.ReactNode, 'aria-describedby'?: string }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        {icon}
      </div>
      <input
        id={id}
        name={id}
        type={type}
        required
        className="w-full pl-10 pr-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-describedby={ariaDescribedby}
      />
    </div>
  </div>
));

export const RegisterPage: React.FC<RegisterPageProps> = ({ onAuthSuccess, showToast, navigateTo }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoToHomepage = () => {
    window.location.hash = '';
  };

  const validateForm = (): boolean => {
    if (username.trim().length < 3) {
      setError('Tên đăng nhập phải có ít nhất 3 ký tự.');
      return false;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return false;
    }
    setError('');
    return true;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setLoading(true);
    setError('');

    try {
      // BƯỚC 1: Chỉ đăng ký người dùng.
      const newUser = await sessionService.registerUser(username, password);
      
      if (!newUser) {
        // Tên người dùng đã tồn tại
        setError('Tên người dùng đã tồn tại. Vui lòng chọn tên khác.');
        showToast('Đăng ký thất bại. Tên người dùng có thể đã được sử dụng.', 'error');
        setLoading(false);
        return;
      }

      // Đăng ký cục bộ thành công!
      showToast('Tài khoản đã được tạo! Đang đăng nhập...', 'info');

      // BƯỚC 2: Tự động đăng nhập sau khi đăng ký thành công.
      const session = await sessionService.loginUser(username, password);

      if (session) {
        showToast('Đăng nhập thành công!', 'success');
        // Chờ một chút để người dùng thấy toast
        await new Promise(resolve => setTimeout(resolve, 500)); 
        onAuthSuccess(session.userName, session.userId);
      } else {
        // Trường hợp hiếm gặp: đăng ký được nhưng đăng nhập ngay sau đó lại lỗi.
        setError('Tài khoản đã được tạo nhưng không thể tự động đăng nhập. Vui lòng thử đăng nhập thủ công.');
        showToast('Lỗi đăng nhập tự động.', 'error');
        navigateTo('login'); // Điều hướng đến trang đăng nhập
      }

    } catch (err) {
      console.error("Registration process error:", err);
      setError('Lỗi hệ thống trong quá trình đăng ký. Vui lòng thử lại.');
      showToast('Lỗi hệ thống khi đăng ký.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-sky-400">Tạo tài khoản SmartM AI</h1>
          <p className="mt-2 text-slate-400">Tham gia SmartM AI ngay hôm nay!</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <InputField
            id="register-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Chọn tên đăng nhập"
            label="Tên đăng nhập (ít nhất 3 ký tự)"
            icon={<PageUserCircleIcon className="w-5 h-5" />}
          />
          <InputField
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tạo mật khẩu"
            label="Mật khẩu (ít nhất 6 ký tự)"
            icon={<LockIcon className="w-5 h-5" />}
            aria-describedby="password-hint"
          />
          <div id="password-hint" className="text-xs text-slate-400 px-1">
            Sử dụng mật khẩu mạnh để bảo vệ tài khoản của bạn.
          </div>

          <InputField
            id="register-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Xác nhận lại mật khẩu"
            label="Xác nhận mật khẩu"
            icon={<LockIcon className="w-5 h-5" />}
          />
          
          {error && <p className="text-sm text-red-400 text-center pt-1">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label={loading ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="text-white" />
                  <span className="ml-2">Đang tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <PageUserPlusIcon className="w-5 h-5 mr-2" />
                  Đăng ký
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-slate-400">
          Đã có tài khoản?{' '}
          <button 
            onClick={() => navigateTo('login')} 
            className="font-medium text-sky-400 hover:text-sky-300 hover:underline"
            aria-label="Chuyển đến trang đăng nhập"
          >
            Đăng nhập
          </button>
        </p>
        <div className="text-center mt-4">
          <button
            onClick={handleGoToHomepage}
            className="w-full max-w-xs mx-auto bg-slate-600 hover:bg-slate-500 text-slate-200 font-medium py-2.5 px-4 rounded-lg shadow-sm transition duration-150 ease-in-out"
            aria-label="Về Trang Chủ"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
       <footer className="mt-8 text-center text-slate-500 text-xs">
        &copy; {new Date().getFullYear()} SmartM AI.
      </footer>
    </div>
  );
};

// Placeholder icon
const LockIcon: React.FC<{className?: string}> = ({ className }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
);

