import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { TokenResponse } from '@/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      const response = await api.post<unknown, TokenResponse>('/auth/login', data);
      setTokens(response);
      toast.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (err: any) {
        const msg = err.response?.data?.error?.message || 'Invalid credentials';
        toast.error(msg);
    }
  };

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onLoginSubmit)} className="space-y-3">
            {/* Email */}
            <FormField
                control={form.control}
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
                control={form.control}
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
                disabled={form.formState.isSubmitting}
            >
                {form.formState.isSubmitting ? 'Logging in...' : (
                    <span className="flex items-center gap-2">Login <ArrowRight className="w-5 h-5" /></span>
                )}
            </Button>
        </form>
    </Form>
  );
}