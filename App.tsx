
import React, { useState, useEffect, useCallback } from 'react';
import * as sessionService from './services/sessionService';
import { settingsService } from './services/settingsService';
import type { RouteType, AppStatusType, UserDataState, ToastMessage, AppSettings } from './types';
import { DEFAULT_APP_SETTINGS } from './constants';
import { LoadingSpinner } from './LoadingSpinner';
import { Toast } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MainPage } from './pages/MainPage';
import { SettingsPage } from './pages/SettingsPage';
import { Analytics } from '@vercel/analytics/react'; // <-- DÒNG 1: THÊM VÀO ĐÂY

// Extend window interface for global functions
declare global {
  interface Window {
    MyMeetingAppHandle?: {
      navigateToRoute: (route: RouteType, replace?: boolean, options?: any) => void;
      isAuthenticated: () => boolean;
      getCurrentUserName: () => string | null;
      logout: () => void;
      getAnalyticsStats: () => sessionService.AnalyticsData; // Keep existing local for fallback
      getHybridAnalyticsStats: () => Promise<sessionService.HybridAnalyticsData>; // Add new hybrid
    };
    triggerGlobalRouteChange?: () => void;
  }
}


const App: React.FC = () => {
  const [appStatus, setAppStatus] = useState<AppStatusType>('initializing');
  const [currentRoute, setCurrentRoute] = useState<RouteType>('login');
  const [userData, setUserData] = useState<UserDataState>({ name: '', id: null });
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);
  const [mainPageKey, setMainPageKey] = useState<number>(Date.now()); // For resetting MainPage

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToastMessages(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToastMessages(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const navigateTo = useCallback((route: RouteType, replace: boolean = false, options: any = {}) => {
    const currentHashTarget = window.location.hash.substring(2).split('?')[0];
    const newRouteTarget = `${route}${options.showSavedSessions ? '?showSavedSessions=true' : ''}`;
    
    if (options.resetMainPage) {
        setMainPageKey(Date.now());
    }

    if (currentRoute !== route || currentHashTarget !== route || options.showSavedSessions) {
        setCurrentRoute(route); // Update internal React state
        // Update URL hash, which then triggers handleRouteOrAuthChange in index.html
        const newHash = `#/${newRouteTarget}`;
        if (window.location.hash !== newHash) {
             if (replace) {
                window.location.replace(newHash);
            } else {
                window.location.hash = newHash;
            }
        } else {
            // If hash is already correct, but we need to trigger UI update (e.g. for sidebar)
            if (window.triggerGlobalRouteChange) window.triggerGlobalRouteChange();
        }
    } else if (window.triggerGlobalRouteChange) {
        // Even if route is the same, options might change visibility of components within index.html
        window.triggerGlobalRouteChange();
    }
  }, [currentRoute]);


  const handleAuthSuccess = useCallback(async (name: string, userId: string) => {
    setUserData({ name, id: userId });
    const loadedSettings = await settingsService.init(userId);
    setAppSettings(loadedSettings);
    setAppStatus('app_ready');
    
    // Redirect to homepage, index.html will handle UI update
    window.location.href = window.location.pathname; // Clears hash
    if (window.triggerGlobalRouteChange) window.triggerGlobalRouteChange();

  }, []);

 const handleLogout = useCallback(async () => {
    sessionService.logoutUser();
    setUserData({ name: '', id: null });
    const guestSettings = await settingsService.init(null);
    setAppSettings(guestSettings);
    setCurrentRoute('login'); // Set default route for next dashboard view
    setAppStatus('auth_required');
    showToast('Đã đăng xuất.', 'info');
    
    // Redirect to homepage, index.html will handle UI update
    window.location.href = window.location.pathname; // Clears hash
    if (window.triggerGlobalRouteChange) window.triggerGlobalRouteChange();

  }, [showToast]);

  const handleUpdateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updatedSettings = await settingsService.updateSettings(newSettings);
    setAppSettings(updatedSettings);
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      let currentUserId = sessionService.getCurrentUserId();
      let finalSettings: AppSettings;

      if (sessionService.isAuthenticated() && currentUserId) {
        setUserData({ name: sessionService.getCurrentUserName() || 'User', id: currentUserId });
        finalSettings = await settingsService.init(currentUserId);
        setAppSettings(finalSettings);
        // Determine initial route from hash or default to main
        const hashRoute = window.location.hash.substring(2).split('?')[0] as RouteType;
        setCurrentRoute(['main', 'settings', 'login', 'register'].includes(hashRoute) ? hashRoute : 'main');
        setAppStatus('app_ready');
      } else {
        finalSettings = await settingsService.init(null); // Guest settings
        setAppSettings(finalSettings);
        const hashRoute = window.location.hash.substring(2).split('?')[0] as RouteType;
        setCurrentRoute(hashRoute === 'register' ? 'register' : 'login');
        setAppStatus('auth_required');
      }
      if (window.triggerGlobalRouteChange) window.triggerGlobalRouteChange();
    };
    initializeApp();
  }, []);
  
  useEffect(() => {
    document.documentElement.className = appSettings.theme;
    document.body.className = appSettings.theme === 'dark' ? 'bg-slate-900' : 'bg-sky-50';
  }, [appSettings.theme]);

  // Expose methods to global scope for index.html
  useEffect(() => {
    window.MyMeetingAppHandle = {
      navigateToRoute: navigateTo,
      isAuthenticated: sessionService.isAuthenticated,
      getCurrentUserName: sessionService.getCurrentUserName,
      logout: handleLogout,
      getAnalyticsStats: sessionService.getAnalyticsStats, // Local stats
      getHybridAnalyticsStats: sessionService.getHybridAnalyticsStats, // Hybrid stats
    };
    // Initial trigger after app logic is ready
    if (window.triggerGlobalRouteChange) {
        window.triggerGlobalRouteChange();
    }
  }, [navigateTo, handleLogout]);


  if (appStatus === 'initializing') {
    return (
      <div className={`flex items-center justify-center min-h-screen ${appSettings.theme === 'dark' ? 'bg-slate-900' : 'bg-sky-100'}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  // Render content based on currentRoute, only if dashboard is active
  // The visibility of the entire dashboard section is controlled by index.html
  let pageContent = null;
  if (appStatus === 'auth_required') {
    if (currentRoute === 'login') {
      pageContent = <LoginPage onAuthSuccess={handleAuthSuccess} showToast={showToast} navigateTo={navigateTo} />;
    } else if (currentRoute === 'register') {
      pageContent = <RegisterPage onAuthSuccess={handleAuthSuccess} showToast={showToast} navigateTo={navigateTo} />;
    }
  } else if (appStatus === 'app_ready' && userData.id) {
    if (currentRoute === 'main') {
      pageContent = <MainPage key={mainPageKey} userData={userData} appSettings={appSettings} showToast={showToast} navigateTo={navigateTo} onSettingsChange={handleUpdateSettings} />;
    } else if (currentRoute === 'settings') {
      pageContent = <SettingsPage currentSettings={appSettings} onUpdateSettings={handleUpdateSettings} showToast={showToast} navigateTo={navigateTo} />;
    }
  }


  return (
    <>
      <div className={`app-container min-h-screen ${appSettings.theme}`}>
        {pageContent}
      </div>
      
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex flex-col items-end space-y-3 px-4 py-6 sm:p-6 z-50" 
      >
        {toastMessages.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={dismissToast} />
        ))}
      </div>
            <Analytics />

    </>
  );
};

export default App;