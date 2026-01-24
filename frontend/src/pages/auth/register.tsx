import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth-store';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TagsInput } from '@/components/ui/tags-input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 words'),
  age: z.coerce.number().min(3).max(120),
  interests: z.array(z.string()).min(1, 'Add at least one interest'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      age: 18,
      interests: [],
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const payload = {
        ...data,
        interests: data.interests, // Already an array
      };

      await api.post('/auth/register', payload);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
       if (err.response?.data?.message) {
         toast.error(err.response.data.message);
      } else if (err.response?.data?.detail?.message) {
          toast.error(err.response.data.detail.message);
      } else {
        toast.error('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="clean-card bg-card p-2">
          <CardHeader className="text-center space-y-2 pb-8 pt-6">
            <div className="flex justify-center mb-2">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="w-8 h-8 fill-current" />
                </div>
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">
              Join GreenSteps
            </CardTitle>
            <p className="text-muted-foreground">
                Start your sustainability journey today
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
                        <Input placeholder="email@example.com" {...field} className="bg-transparent border-input focus:ring-2 focus:ring-primary/20 transition-all" />
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
                        <Input type="password" placeholder="********" {...field} className="bg-transparent border-input focus:ring-2 focus:ring-primary/20 transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} className="bg-transparent border-input focus:ring-2 focus:ring-primary/20 transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Age</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="bg-transparent border-input focus:ring-2 focus:ring-primary/20 transition-all" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="interests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground font-medium">Interests</FormLabel>
                      <FormControl>
                        <TagsInput 
                            value={field.value} 
                            onChange={field.onChange} 
                            placeholder="Type interest and press Enter..." 
                            className="bg-transparent border-input focus-within:ring-primary/20"
                        />
                      </FormControl>
                      <FormDescription>Press Enter or comma to add</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                    type="submit" 
                    className="alive-button w-full font-semibold py-6 text-lg mt-2" 
                    disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? 'Registering...' : 'Register'}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="justify-center pb-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
