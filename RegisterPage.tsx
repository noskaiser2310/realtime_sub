import React, { useState } from 'react';
import * as sessionService from './services/sessionService';
import { LoadingSpinner } from './LoadingSpinner';
import { UserPlusIcon } from './components/icons/FeatureIcons';

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
    try {
      const newUserSession = await sessionService.registerUser(username, password);
      if (newUserSession) {
        showToast('Đăng ký thành công! Đang đăng nhập...', 'success');
        // Wait for toast to be visible before navigating
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        onAuthSuccess(newUserSession.userName, newUserSession.userId);
      } else {
        setError('Tên người dùng đã tồn tại hoặc có lỗi xảy ra.');
        showToast('Đăng ký thất bại. Tên người dùng có thể đã được sử dụng.', 'error');
      }
    } catch (err) {
      console.error("Registration error:", err);
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
          <h1 className="text-3xl font-bold text-sky-400">Tạo tài khoản</h1>
          <p className="mt-2 text-slate-400">Tham gia Trợ lý Cuộc họp AI ngay hôm nay!</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <InputField
            id="register-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Chọn tên đăng nhập"
            label="Tên đăng nhập (ít nhất 3 ký tự)"
            icon={<UserCircleIcon className="w-5 h-5" />}
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
                  <UserPlusIcon className="w-5 h-5 mr-2" />
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
      </div>
       <footer className="mt-8 text-center text-slate-500 text-xs">
        &copy; {new Date().getFullYear()} Real-time Meeting Assistant.
      </footer>
    </div>
  );
};

// Placeholder icons, assuming defined elsewhere or add here
const UserCircleIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const LockIcon: React.FC<{className?: string}> = ({ className }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
);
