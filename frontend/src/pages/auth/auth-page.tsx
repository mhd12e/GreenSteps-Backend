import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthRedirect } from '@/hooks/use-auth-redirect';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo.png';
import { 
  Sprout, Coins, Gamepad2, Bot 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeatureBadge } from '@/components/ui/feature-badge';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { useTitle } from '@/hooks/use-title';

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

  const handleRegisterSuccess = () => {
      // Switch to login tab
      setActiveTab('login');
      navigate('/login');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative font-sans">
      
      {/* 1. Header Section */}
      <div className="text-center mb-8 space-y-6 z-10 max-w-2xl w-full">
        <div className="flex flex-col items-center gap-4">
            {/* Logo Box */}
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-teal-900/5 border border-teal-100 transform hover:rotate-3 transition-transform duration-300">
                <img src={logo} alt="GreenSteps" className="w-10 h-10 object-contain" />
            </div>
            
            {/* Title & Subtitle */}
            <div className="space-y-2">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">GreenSteps</h1>
                <p className="text-gray-500 text-lg font-medium">Learn sustainability. Save money. Save the planet.</p>
            </div>
        </div>

        {/* Feature Tags Row */}
        <div className="flex flex-wrap justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <FeatureBadge icon={Sprout} text="Track your eco impact" />
            <FeatureBadge icon={Coins} text="Save money sustainably" />
            <FeatureBadge icon={Gamepad2} text="Gamified learning" />
            <FeatureBadge icon={Bot} text="AI-powered coaching" />
        </div>
      </div>

      {/* 2. Main Card */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-teal-900/10 border border-gray-100 p-2 z-10"
      >
        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-xl my-4 mx-6">
            <button
                onClick={() => { setActiveTab('login'); navigate('/login'); }}
                className={cn(
                    "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200",
                    activeTab === 'login' 
                        ? "bg-teal-600 text-white shadow-md" 
                        : "text-gray-500 hover:text-gray-900"
                )}
            >
                Login
            </button>
            <button
                onClick={() => { setActiveTab('signup'); navigate('/register'); }}
                className={cn(
                    "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200",
                    activeTab === 'signup' 
                        ? "bg-teal-600 text-white shadow-md" 
                        : "text-gray-500 hover:text-gray-900"
                )}
            >
                Sign Up
            </button>
        </div>

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
