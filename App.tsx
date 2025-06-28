

import React, { useState, useEffect, useCallback } from 'react';
import * as sessionService from './services/sessionService';
import { settingsService } from './services/settingsService';
import type { RouteType, AppStatusType, UserDataState, ToastMessage, AppSettings, PlanTierId, PlanDetails } from './types';
import { DEFAULT_APP_SETTINGS, PLAN_CONFIG, DEFAULT_PLAN_ID } from './constants';
import { LoadingSpinner } from './LoadingSpinner';
import { Toast } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MainPage } from './pages/MainPage';
import { SettingsPage } from './pages/SettingsPage';
import { Analytics } from '@vercel/analytics/react'; 

declare global {
  interface Window {
    MyMeetingAppHandle?: {
      navigateToRoute: (route: RouteType, replace?: boolean, options?: any) => void;
      isAuthenticated: () => boolean;
      getCurrentUserName: () => string | null;
      logout: () => void;
      getAnalyticsStats: () => sessionService.AnalyticsData; 
      getHybridAnalyticsStats: () => Promise<sessionService.HybridAnalyticsData>;
      updateUserPlan: (planId: PlanTierId) => void; // New: For checkout to call
      triggerUsageDisplayUpdate?: () => void; // For MainPage to listen to
    };
    triggerGlobalRouteChange?: () => void;
  }
}


const App: React.FC = () => {
  const [appStatus, setAppStatus] = useState<AppStatusType>('initializing');
  const [currentRoute, setCurrentRoute] = useState<RouteType>('login');
  const [userData, setUserData] = useState<UserDataState>({ name: '', id: null, planTier: null });
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);
  const [mainPageKey, setMainPageKey] = useState<number>(Date.now()); 
  const [currentPlanDetails, setCurrentPlanDetails] = useState<PlanDetails>(PLAN_CONFIG[DEFAULT_PLAN_ID]);


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
        setCurrentRoute(route); 
        const newHash = `#/${newRouteTarget}`;
        if (window.location.hash !== newHash) {
             if (replace) {
                window.location.replace(newHash);
            } else {
                window.location.hash = newHash;
            }
        } else {
            if (window.triggerGlobalRouteChange) window.triggerGlobalRouteChange();
        }
    } else if (window.triggerGlobalRouteChange) {
        window.triggerGlobalRouteChange();
    }
  }, [currentRoute]);

  const updateUserPlanDetails = useCallback((planId: PlanTierId | null) => {
    setCurrentPlanDetails(PLAN_CONFIG[planId || DEFAULT_PLAN_ID]);
    if (window.MyMeetingAppHandle?.triggerUsageDisplayUpdate) {
      window.MyMeetingAppHandle.triggerUsageDisplayUpdate();
    }
  }, []);


  const handleAuthSuccess = useCallback(async (name: string, userId: string) => {
    const userPlanId = sessionService.getCurrentUserPlanTier(userId);
    setUserData({ name, id: userId, planTier: userPlanId });
    updateUserPlanDetails(userPlanId);
    const loadedSettings = await settingsService.init(userId);
    setAppSettings(loadedSettings);
    setAppStatus('app_ready');
    
    window.location.href = window.location.pathname; 
    if (window.triggerGlobalRouteChange) window.triggerGlobalRouteChange();

  }, [updateUserPlanDetails]);

 const handleLogout = useCallback(async () => {
    sessionService.logoutUser();
    setUserData({ name: '', id: null, planTier: null });
    updateUserPlanDetails(null); // Set to guest plan details
    const guestSettings = await settingsService.init(null); 
    setAppSettings(guestSettings);
    setCurrentRoute('login'); 
    setAppStatus('auth_required');
    showToast('Đã đăng xuất.', 'info');
    
    window.location.href = window.location.pathname; 
    if (window.triggerGlobalRouteChange) window.triggerGlobalRouteChange();

  }, [showToast, updateUserPlanDetails]);

  const handleUpdateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updatedSettings = await settingsService.updateSettings(newSettings);
    setAppSettings(updatedSettings);
  }, []);

  const handleUpdateUserPlan = useCallback(async (planId: PlanTierId) => {
    if (userData.id) {
        const success = await sessionService.updateUserPlan(userData.id, planId);
        if (success) {
            setUserData(prev => ({ ...prev, planTier: planId }));
            updateUserPlanDetails(planId);
            showToast(`Đã nâng cấp gói thành công thành ${PLAN_CONFIG[planId].name}!`, 'success');
        } else {
            showToast('Nâng cấp gói thất bại. Vui lòng thử lại.', 'error');
        }
    } else {
        showToast('Vui lòng đăng nhập để thay đổi gói.', 'error');
        navigateTo('login'); // Redirect to login if not authenticated
    }
  }, [userData.id, showToast, navigateTo, updateUserPlanDetails]);


  useEffect(() => {
    const initializeApp = async () => {
      let currentUserId = sessionService.getCurrentUserId();
      let finalSettings: AppSettings;
      let userPlanId: PlanTierId = DEFAULT_PLAN_ID;

      if (sessionService.isAuthenticated() && currentUserId) {
        userPlanId = sessionService.getCurrentUserPlanTier(currentUserId);
        setUserData({ name: sessionService.getCurrentUserName() || 'User', id: currentUserId, planTier: userPlanId });
        finalSettings = await settingsService.init(currentUserId);
        setAppSettings(finalSettings);
        const hashRoute = window.location.hash.substring(2).split('?')[0] as RouteType;
        setCurrentRoute(['main', 'settings', 'login', 'register'].includes(hashRoute) ? hashRoute : 'main');
        setAppStatus('app_ready');
      } else {
        finalSettings = await settingsService.init(null); 
        setAppSettings(finalSettings);
        const hashRoute = window.location.hash.substring(2).split('?')[0] as RouteType;
        setCurrentRoute(hashRoute === 'register' ? 'register' : 'login');
        setAppStatus('auth_required');
      }
      updateUserPlanDetails(userPlanId);
      if (window.triggerGlobalRouteChange) window.triggerGlobalRouteChange();
    };
    initializeApp();
  }, [updateUserPlanDetails]);
  
  useEffect(() => {
    document.documentElement.className = appSettings.theme;
    document.body.className = appSettings.theme === 'dark' ? 'bg-slate-900' : 'bg-sky-50';
  }, [appSettings.theme]);

  useEffect(() => {
    window.MyMeetingAppHandle = {
      ...window.MyMeetingAppHandle, // Preserve existing methods if any
      navigateToRoute: navigateTo,
      isAuthenticated: sessionService.isAuthenticated,
      getCurrentUserName: sessionService.getCurrentUserName,
      logout: handleLogout,
      getAnalyticsStats: sessionService.getAnalyticsStats, 
      getHybridAnalyticsStats: sessionService.getHybridAnalyticsStats,
      updateUserPlan: handleUpdateUserPlan, 
    };
    if (window.triggerGlobalRouteChange) {
        window.triggerGlobalRouteChange();
    }
  }, [navigateTo, handleLogout, handleUpdateUserPlan]);


  if (appStatus === 'initializing') {
    return (
      <div className={`flex items-center justify-center min-h-screen ${appSettings.theme === 'dark' ? 'bg-slate-900' : 'bg-sky-100'}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  let pageContent = null;
  if (appStatus === 'auth_required') {
    if (currentRoute === 'login') {
      pageContent = <LoginPage onAuthSuccess={handleAuthSuccess} showToast={showToast} navigateTo={navigateTo} />;
    } else if (currentRoute === 'register') {
      pageContent = <RegisterPage onAuthSuccess={handleAuthSuccess} showToast={showToast} navigateTo={navigateTo} />;
    }
  } else if (appStatus === 'app_ready' && userData.id) {
    if (currentRoute === 'main') {
      pageContent = <MainPage key={mainPageKey} userData={userData} appSettings={appSettings} planDetails={currentPlanDetails} showToast={showToast} navigateTo={navigateTo} onSettingsChange={handleUpdateSettings} />;
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
