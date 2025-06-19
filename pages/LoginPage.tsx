import React, { useState } from 'react';
import * as sessionService from '../services/sessionService';
import { LoadingSpinner } from '../LoadingSpinner';
import { LoginIcon, UserCircleIcon as PageUserCircleIcon } from '../components/icons/FeatureIcons'; // Renamed to avoid conflict if UserCircleIcon is also defined locally

interface LoginPageProps {
  onAuthSuccess: (userName: string, userId: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  navigateTo: (route: 'register') => void;
}

const InputField = React.memo(({ id, type, value, onChange, placeholder, label, icon }: { id: string, type: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string, label: string, icon: React.ReactNode }) => (
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
      />
    </div>
  </div>
));


export const LoginPage: React.FC<LoginPageProps> = ({ onAuthSuccess, showToast, navigateTo }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoToHomepage = () => {
    window.location.hash = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Tên đăng nhập và mật khẩu không được để trống.');
      return;
    }
    setLoading(true);
    try {
      const userSession = await sessionService.loginUser(username, password);
      if (userSession) {
        showToast('Đăng nhập thành công!', 'success');
        onAuthSuccess(userSession.userName, userSession.userId);
      } else {
        setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        showToast('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.', 'error');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.');
      showToast('Lỗi hệ thống khi đăng nhập.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-sky-400">Đăng nhập SmartM AI</h1>
          <p className="mt-2 text-slate-400">Chào mừng trở lại SmartM AI!</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <InputField
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nhập tên đăng nhập"
            label="Tên đăng nhập"
            icon={<PageUserCircleIcon className="w-5 h-5" />}
          />
          <InputField
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            label="Mật khẩu"
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>}
          />
          
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label={loading ? "Đang đăng nhập..." : "Đăng nhập"}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="text-white" />
                  <span className="ml-2">Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <LoginIcon className="w-5 h-5 mr-2" />
                  Đăng nhập
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-sm text-center text-slate-400">
          Chưa có tài khoản?{' '}
          <button 
            onClick={() => navigateTo('register')} 
            className="font-medium text-sky-400 hover:text-sky-300 hover:underline"
            aria-label="Chuyển đến trang đăng ký"
          >
            Đăng ký ngay
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