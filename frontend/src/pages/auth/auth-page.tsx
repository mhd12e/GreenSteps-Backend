import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TagsInput } from '@/components/ui/tags-input';
import { TokenResponse } from '@/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo.png';
import { 
  Sprout, Coins, Gamepad2, Bot, 
  Mail, Lock, User, Calendar, Eye, EyeOff, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Schemas ---
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 words'),
  age: z.coerce.number().min(3).max(120),
  interests: z.array(z.string()).min(1, 'Add at least one interest'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

// --- Components ---

const FeatureBadge = ({ icon: Icon, text }: { icon: any, text: string }) => (
  <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 text-sm font-medium text-gray-700 hover:scale-105 transition-transform duration-200 cursor-default">
    <Icon className="w-4 h-4 text-teal-600" />
    <span>{text}</span>
  </div>
);

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTokens, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    if (location.pathname === '/register') setActiveTab('signup');
    else setActiveTab('login');
  }, [location.pathname]);

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // --- Forms ---
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema) as any, 
    defaultValues: { email: '', password: '', full_name: '', age: 18, interests: [] },
  });

  // --- Handlers ---
  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      const response = await api.post<unknown, TokenResponse>('/auth/login', data);
      setTokens(response);
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (err: any) {
        const msg = err.response?.data?.message || err.response?.data?.detail?.message || 'Invalid credentials';
        toast.error(msg);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      const payload = { ...data, interests: data.interests };
      await api.post('/auth/register', payload);
      toast.success('Registration successful! Please login.');
      setActiveTab('login');
      navigate('/login');
      loginForm.setValue('email', data.email);
    } catch (err: any) {
        const msg = err.response?.data?.message || err.response?.data?.detail?.message || 'Registration failed';
        toast.error(msg);
    }
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
        {/* Tab Switcher - Hardcoded Colors for Reliability */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
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
                        <Form {...loginForm}>
                            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-3">
                                {/* Email */}
                                <FormField
                                    control={loginForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-teal-600 transition-colors" />
                                                <FormControl>
                                                    <Input 
                                                        placeholder="Email address" 
                                                        {...field} 
                                                        className="pl-12 py-3 bg-gray-50 border-gray-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-xl transition-all font-medium h-12" 
                                                    />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* Password */}
                                <FormField
                                    control={loginForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-teal-600 transition-colors" />
                                                <FormControl>
                                                    <Input 
                                                        type={showPassword ? "text" : "password"} 
                                                        placeholder="Password" 
                                                        {...field} 
                                                        className="pl-12 pr-12 py-3 bg-gray-50 border-gray-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-xl transition-all font-medium h-12" 
                                                    />
                                                </FormControl>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-700 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button 
                                    type="submit" 
                                    className="w-full py-3 rounded-xl font-bold text-lg shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all mt-2 active:scale-95 bg-teal-600 hover:bg-teal-700 text-white h-12" 
                                    disabled={loginForm.formState.isSubmitting}
                                >
                                    {loginForm.formState.isSubmitting ? 'Logging in...' : (
                                        <span className="flex items-center gap-2">Login <ArrowRight className="w-5 h-5" /></span>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="signup"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Form {...registerForm}>
                            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
                                {/* Email */}
                                <FormField
                                    control={registerForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-teal-600 transition-colors" />
                                                <FormControl>
                                                    <Input placeholder="Email address" {...field} className="pl-12 py-3 bg-gray-50 border-gray-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-xl transition-all font-medium h-12" />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Full Name */}
                                    <FormField
                                        control={registerForm.control}
                                        name="full_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="relative group">
                                                    <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-teal-600 transition-colors" />
                                                    <FormControl>
                                                        <Input placeholder="Full Name" {...field} className="pl-12 py-3 bg-gray-50 border-gray-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-xl transition-all font-medium h-12" />
                                                    </FormControl>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {/* Age */}
                                    <FormField
                                        control={registerForm.control}
                                        name="age"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="relative group">
                                                    <Calendar className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-teal-600 transition-colors" />
                                                    <FormControl>
                                                        <Input type="number" placeholder="Age" {...field} className="pl-12 py-3 bg-gray-50 border-gray-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-xl transition-all font-medium h-12" />
                                                    </FormControl>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Password */}
                                <FormField
                                    control={registerForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-teal-600 transition-colors" />
                                                <FormControl>
                                                    <Input 
                                                        type={showPassword ? "text" : "password"} 
                                                        placeholder="Create Password" 
                                                        {...field} 
                                                        className="pl-12 py-3 bg-gray-50 border-gray-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 rounded-xl transition-all font-medium h-12" 
                                                    />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Interests */}
                                <FormField
                                    control={registerForm.control}
                                    name="interests"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <TagsInput 
                                                    value={field.value} 
                                                    onChange={field.onChange} 
                                                    placeholder="Add interests (Eco, Vegan...)" 
                                                    className="bg-gray-50 border-gray-200 focus-within:bg-white focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 rounded-xl min-h-[48px] p-3 font-medium transition-all"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button 
                                    type="submit" 
                                    className="w-full py-3 rounded-xl font-bold text-lg shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all mt-2 active:scale-95 bg-teal-600 hover:bg-teal-700 text-white h-12" 
                                    disabled={registerForm.formState.isSubmitting}
                                >
                                    {registerForm.formState.isSubmitting ? 'Creating Account...' : 'Sign Up Free'}
                                </Button>
                            </form>
                        </Form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-8 text-xs text-gray-500 text-center max-w-sm">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </div>
    </div>
  );
}