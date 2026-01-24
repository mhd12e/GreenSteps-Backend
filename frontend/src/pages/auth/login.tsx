import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { TokenResponse } from '@/types';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTokens, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await api.post<unknown, TokenResponse>('/auth/login', data);
      setTokens(response);
      toast.success('Welcome back!');
      
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.message) {
         toast.error(err.response.data.message);
      } else if (err.response?.data?.detail?.message) {
          toast.error(err.response.data.detail.message);
      } else {
        toast.error('Invalid email or password');
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="clean-card bg-card p-2">
          <CardHeader className="space-y-2 text-center pb-8 pt-6">
            <div className="flex justify-center mb-2">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Leaf className="w-8 h-8 fill-current" />
                </div>
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">
              Welcome Back
            </CardTitle>
            <p className="text-muted-foreground">
                Enter your credentials to access your account
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Email</FormLabel>
                      <FormControl>
                        <Input 
                            placeholder="hello@example.com" 
                            {...field} 
                            className="bg-transparent border-input focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Password</FormLabel>
                      <FormControl>
                        <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            className="bg-transparent border-input focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                    type="submit" 
                    className="alive-button w-full font-semibold py-6 text-lg mt-2" 
                    disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="justify-center pb-6">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
