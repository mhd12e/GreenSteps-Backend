import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthRedirect } from '@/hooks/use-auth-redirect';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { useTitle } from '@/hooks/use-title';
import { AuthHeader } from '@/components/auth/layout/auth-header';
import { AuthTabs } from '@/components/auth/layout/auth-tabs';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  useTitle(activeTab === 'login' ? 'Sign In' : 'Join');

  useAuthRedirect();

  // Sync tab with URL
  useEffect(() => {
    if (location.pathname === '/register') setActiveTab('signup');
    else setActiveTab('login');
  }, [location.pathname]);

  const handleTabChange = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    navigate(tab === 'login' ? '/login' : '/register');
  };

  const handleRegisterSuccess = () => {
      // Switch to login tab
      setActiveTab('login');
      navigate('/login');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative font-sans">
      
      {/* 1. Header Section */}
      <AuthHeader />

      {/* 2. Main Card */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-teal-900/10 border border-gray-100 p-2 z-10"
      >
        {/* Tab Switcher */}
        <AuthTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Form Content */}
        <div className="px-6 pb-8 pt-2">
            <AnimatePresence mode="wait">
                {activeTab === 'login' ? (
                    <motion.div 
                        key="login"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <LoginForm />
                    </motion.div>
                ) : (
                    <motion.div 
                        key="signup"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <RegisterForm onSuccess={handleRegisterSuccess} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-8 text-xs text-gray-500 text-center max-w-sm leading-relaxed">
        By continuing, you agree to our{' '}
        <Link to="/legal/terms" className="text-primary hover:underline font-medium">Terms of Service</Link>{' '}
        and{' '}
        <Link to="/legal/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>.
      </div>
    </div>
  );
}
