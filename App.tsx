
import React, { useState, useEffect, useCallback } from 'react';
import * as sessionService from './services/sessionService';
import { settingsService } from './services/settingsService';
import type { RouteType, AppStatusType, UserDataState, ToastMessage, LanguageOption, ThemeType, AppSettings } from './types';
import { SUPPORTED_LANGUAGES, DEFAULT_APP_SETTINGS } from './constants';
import { LoadingSpinner } from './LoadingSpinner';
import { Toast } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MainPage } from './pages/MainPage';
import { SettingsPage } from './pages/SettingsPage';

const App: React.FC = () => {
  const [appStatus, setAppStatus] = useState<AppStatusType>('initializing');
  const [currentRoute, setCurrentRoute] = useState<RouteType>('login'); // Default to login
  const [userData, setUserData] = useState<UserDataState>({ name: 'User', id: null });
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastMessage['type']) => {
    setToasts(prevToasts => [...prevToasts, { id: Date.now(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const navigate = useCallback((route: RouteType, replace = false) => {
    const newHash = `#/${route}`;
    if (window.location.hash === newHash && currentRoute === route) {
        return; 
    }
    
    if (replace) {
        window.location.replace(newHash);
    } else {
        window.location.hash = newHash;
    }
  }, [currentRoute]); 

  const handleHashChange = useCallback(() => {
    const hash = window.location.hash.replace('#/', '').split('?')[0] || 'login';
    let newRoute: RouteType;

    if (['login', 'register', 'main', 'settings'].includes(hash)) {
        newRoute = hash as RouteType;
    } else {
        const isAuth = sessionService.isAuthenticated();
        newRoute = isAuth ? 'main' : 'login';
        if (window.location.hash.replace('#/', '').split('?')[0] !== newRoute) {
             window.location.hash = `#/${newRoute}`;
             return; 
        }
    }

    if (currentRoute !== newRoute) {
        setCurrentRoute(newRoute);
    }
  }, [currentRoute]); 


  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    // Removed direct call to handleHashChange(). initApp will now drive initial route setup.
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);


  // App Initialization - Runs once
  useEffect(() => {
    const initApp = async () => {
      try {
        const isAuth = sessionService.isAuthenticated();
        const userId = sessionService.getCurrentUserId();
        const userName = sessionService.getCurrentUserName() || 'User';
        
        const settings = await settingsService.init(userId);
        
        setUserData({ name: userName, id: userId });
        setAppSettings(settings);
        
        const hashRoute = window.location.hash.replace('#/', '').split('?')[0] as RouteType;
        let targetRoute: RouteType;

        if (isAuth) {
          if (hashRoute === 'login' || hashRoute === 'register' || !hashRoute) { 
            targetRoute = 'main';
          } else if (['main', 'settings'].includes(hashRoute)) {
            targetRoute = hashRoute;
          } else {
             targetRoute = 'main'; 
          }
        } else { 
          if (hashRoute === 'register') {
            targetRoute = 'register';
          } else { 
            targetRoute = 'login'; 
          }
        }
        
        if (window.location.hash.replace('#/', '').split('?')[0] !== targetRoute) {
            navigate(targetRoute, true); // This will trigger hashchange and handleHashChange
        } else {
            // If hash is already correct, but state might not be, sync state.
            // This also covers the case where no navigation is needed initially.
            if (currentRoute !== targetRoute) {
                 setCurrentRoute(targetRoute);
            }
        }
        setAppStatus(isAuth ? 'app_ready' : 'auth_required');
      } catch (error) {
        console.error('[App] Critical initialization error:', error);
        showToast('Khởi động ứng dụng thất bại', 'error');
        setAppStatus('auth_required'); 
        navigate('login', true); // Attempt to navigate to login on critical failure
      }
    };

    initApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, showToast]); // Added navigate and showToast to acknowledge their use, though intent is run-once.


  // Route and Auth Synchronization
  useEffect(() => {
    if (appStatus === 'initializing') return;

    const isAuth = !!userData.id;

    if (isAuth) { 
      if (currentRoute === 'login' || currentRoute === 'register') {
        navigate('main', true); 
      } else if (!['main', 'settings'].includes(currentRoute)) {
        navigate('main', true);
      }
    } else { // Unauthenticated
      if (currentRoute !== 'login' && currentRoute !== 'register') {
        navigate('login', true);
      }
    }
  }, [currentRoute, userData.id, appStatus, navigate]);

  // Theme setting Effect - Moved before early return
  useEffect(() => {
    document.body.className = appSettings.theme === 'dark' ? 'bg-slate-900' : 'bg-sky-100';
  }, [appSettings.theme]);

  const handleAuthSuccess = useCallback(async (newUserName: string, newUserId: string) => {
    setUserData({ name: newUserName, id: newUserId });
    const userSettings = await settingsService.init(newUserId); 
    setAppSettings(userSettings);
    setAppStatus('app_ready');
    navigate('main', true); 
  }, [navigate]); 

  const handleLogout = useCallback(async () => {
    sessionService.logoutUser();
    setUserData({ name: 'User', id: null });
    const guestSettings = await settingsService.init(null); 
    setAppSettings(guestSettings);
    setAppStatus('auth_required');
    navigate('login', true); 
  }, [navigate]); 

  const handleUpdateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updatedSettings = await settingsService.updateSettings(newSettings);
    setAppSettings(updatedSettings);
  }, []); 


  if (appStatus === 'initializing') {
    return (
      <div className="fullscreen-loader">
        <LoadingSpinner size="lg" />
        <p>Đang khởi tạo ứng dụng...</p>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentRoute) {
      case 'login':
        return !userData.id ? <LoginPage key="login" onAuthSuccess={handleAuthSuccess} showToast={showToast} navigateTo={navigate as (route: 'register' | 'login') => void} /> : null;
      case 'register':
        return !userData.id ? <RegisterPage key="register" onAuthSuccess={handleAuthSuccess} showToast={showToast} navigateTo={navigate as (route: 'register' | 'login') => void} /> : null;
      case 'main':
        if (appStatus === 'app_ready' && userData.id) {
          return <MainPage 
                    key="main"
                    userData={userData} 
                    appSettings={appSettings}
                    onLogout={handleLogout} 
                    showToast={showToast} 
                    navigateTo={navigate as (route: 'settings') => void} // Corrected MainPage's navigateTo type
                    onSettingsChange={handleUpdateSettings}
                 />;
        }
        return null; 
      case 'settings':
        if (appStatus === 'app_ready' && userData.id) {
          return <SettingsPage 
                    key="settings"
                    currentSettings={appSettings} 
                    onUpdateSettings={handleUpdateSettings} 
                    showToast={showToast} 
                    navigateTo={navigate as (route: 'main') => void} // Corrected SettingsPage's navigateTo type
                 />;
        }
        return null; 
      default:
        // This case should ideally not be hit frequently if routing logic is robust.
        // A loader is fine, as effects should correct the route.
        return <div className="fullscreen-loader" key="loader-invalid-route"><LoadingSpinner size="lg" /><p>Đang tải trang...</p></div>;
    }
  };
  

  return (
    <React.Fragment>
      <div className={`app-container theme-${appSettings.theme}`}>
        {renderPage()}
      </div>
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
        ))}
      </div>
    </React.Fragment>
  );
};

export default App;
