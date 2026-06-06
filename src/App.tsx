import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { safeStorage } from './utils/safeStorage';

import AnnouncementBanner from './components/AnnouncementBanner';
import WebLayout from './components/WebLayout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ProfileEdit from './pages/ProfileEdit';
import AccountSecurity from './pages/AccountSecurity';
import NotificationSettings from './pages/NotificationSettings';
import AlertSettings from './pages/AlertSettings';
import MapSettings from './pages/MapSettings';
import StorageSettings from './pages/StorageSettings';
import EmergencyProfile from './pages/EmergencyProfile';
import FamilySettings from './pages/FamilySettings';
import MutualAid from './pages/MutualAid';
import AlertHistory from './pages/AlertHistory';
import AlertDetail from './pages/AlertDetail';
import ShelterDetail from './pages/ShelterDetail';
import ShelterList from './pages/ShelterList';
import RoutePlan from './pages/RoutePlan';
import NavigationPage from './pages/NavigationPage';
import SOSHistory from './pages/SOSHistory';
import InviteFriends from './pages/InviteFriends';
import CitySelect from './pages/CitySelect';
import Subscription from './pages/Subscription';
import SimulationTrial from './pages/SimulationTrial';
import Announcements from './pages/Announcements';
import Points from './pages/Points';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';
import AboutApp from './pages/AboutApp';
import CustomerServiceWidget from './components/CustomerServiceWidget';
import { usePushRegistration } from './hooks/usePushRegistration';

export const DemoContext = createContext<{ isDemo: boolean; exitDemo: () => void }>({ isDemo: false, exitDemo: () => {} });
export const useDemo = () => useContext(DemoContext);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(() => {
    try {
      const demoMode = safeStorage.getItem('demo_mode') === 'true';
      if (demoMode) {
        const expires = Number(safeStorage.getItem('demo_expires') || 0);
        if (expires && Date.now() > expires) {
          safeStorage.removeItem('demo_mode');
          safeStorage.removeItem('demo_expires');
          return false;
        }
      }
      return demoMode;
    } catch {
      return false;
    }
  });

  const exitDemo = () => {
    safeStorage.removeItem('demo_mode');
    setIsDemo(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        // 取会话失败（存储异常 / 网络问题）也必须让首屏出来，绝不卡在加载态
        setLoading(false);
      });

    // 兜底：万一 getSession 既不 resolve 也不 reject（异常环境下挂起），8 秒后强制结束加载
    const t = setTimeout(() => setLoading(false), 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const isAuthenticated = !!user || isDemo;

  // 原生平台：登录后注册推送（APNs/FCM），让关屏/退后台也能收到预警
  usePushRegistration(isAuthenticated);

  const Wrap = ({ children }: { children: React.ReactNode }) => <WebLayout>{children}</WebLayout>;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <DemoContext.Provider value={{ isDemo, exitDemo }}>
      <HashRouter>
        <AnnouncementBanner />
        {isAuthenticated && <CustomerServiceWidget />}
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/auth" element={isAuthenticated ? <Navigate to="/dashboard" /> : <AuthPage />} />
            <Route path="/dashboard" element={isAuthenticated ? <Wrap><Dashboard /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/settings" element={isAuthenticated ? <Wrap><Settings /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/profile-edit" element={isAuthenticated ? <Wrap><ProfileEdit /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/account-security" element={isAuthenticated ? <Wrap><AccountSecurity /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/notification-settings" element={isAuthenticated ? <Wrap><NotificationSettings /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/alert-settings" element={isAuthenticated ? <Wrap><AlertSettings /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/map-settings" element={isAuthenticated ? <Wrap><MapSettings /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/storage-settings" element={isAuthenticated ? <Wrap><StorageSettings /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/emergency-profile" element={isAuthenticated ? <Wrap><EmergencyProfile /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/family-settings" element={isAuthenticated ? <Wrap><FamilySettings /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/mutual-aid" element={isAuthenticated ? <Wrap><MutualAid /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/alert-history" element={isAuthenticated ? <Wrap><AlertHistory /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/alert/:id" element={isAuthenticated ? <Wrap><AlertDetail /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/shelters" element={isAuthenticated ? <Wrap><ShelterList /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/shelter/:id" element={isAuthenticated ? <Wrap><ShelterDetail /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/route-plan" element={isAuthenticated ? <Wrap><RoutePlan /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/navigation" element={isAuthenticated ? <Wrap><NavigationPage /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/sos-history" element={isAuthenticated ? <Wrap><SOSHistory /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/invite-friends" element={isAuthenticated ? <Wrap><InviteFriends /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/city-select" element={isAuthenticated ? <Wrap><CitySelect /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/subscription" element={isAuthenticated ? <Wrap><Subscription /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/simulation" element={isAuthenticated ? <Wrap><SimulationTrial /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/announcements" element={isAuthenticated ? <Wrap><Announcements /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/points" element={isAuthenticated ? <Wrap><Points /></Wrap> : <Navigate to="/auth" />} />
            <Route path="/about" element={<AboutApp />} />
            {/* 兜底：任何未匹配的路由都重定向，绝不渲染空白页（Apple 2.1 应用完整性） */}
            <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />} />
          </Routes>
        </AnimatePresence>
      </HashRouter>
    </DemoContext.Provider>
  );
}

export default App;
