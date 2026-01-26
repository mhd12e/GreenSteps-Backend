import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagsInput } from '@/components/ui/tags-input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Mail, Lock, User, Calendar, Eye, EyeOff } from 'lucide-react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { TURNSTILE_SITE_KEY } from '@/lib/config';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().trim().refine((val) => val.split(/\s+/).length >= 2, {
    message: 'Please enter your full name (first and last name)',
  }),
  age: z.coerce.number().min(3).max(120),
  interests: z.array(z.string()).min(1, 'Add at least one interest'),
  turnstile_token: z.string().min(1, 'Please complete the security check'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
    onSuccess: (email: string) => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { email: '', password: '', full_name: '', age: undefined, interests: [], turnstile_token: '' },
  });

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      const payload = { ...data, interests: data.interests };
      await api.post('/auth/register', payload);
      toast.success('Registration successful! Please login.');
      onSuccess(data.email);
    } catch (err: any) {
        const msg = err.response?.data?.error?.message || 'Registration failed';
        toast.error(msg);
        // Reset turnstile on failure
        turnstileRef.current?.reset();
        form.setValue('turnstile_token', '');
    }
  };

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onRegisterSubmit)} className="space-y-3">
            {/* Email */}
            <FormField
                control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                control={form.control}
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

            {/* Interests */}
            <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <TagsInput 
                                value={field.value} 
                                onChange={field.onChange} 
                                placeholder="Add interests (Eco, Vegan...)" 
                                className="bg-gray-50 border border-gray-200 focus-within:bg-white focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 rounded-xl min-h-[48px] p-3 font-medium transition-all"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="turnstile_token"
                render={({ field }) => (
                    <FormItem className="flex flex-col items-center py-2">
                        <FormControl>
                            <Turnstile
                                ref={turnstileRef}
                                siteKey={TURNSTILE_SITE_KEY}
                                onSuccess={(token) => field.onChange(token)}
                                onExpire={() => field.onChange('')}
                                onError={() => field.onChange('')}
                                options={{
                                    theme: 'light',
                                    size: 'normal',
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <Button 
                type="submit" 
                className="w-full py-3 rounded-xl font-bold text-lg shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all mt-2 active:scale-95 bg-teal-600 hover:bg-teal-700 text-white h-12" 
                disabled={form.formState.isSubmitting}
            >
                {form.formState.isSubmitting ? 'Creating Account...' : 'Sign Up Free'}
            </Button>
        </form>
    </Form>
  );
}