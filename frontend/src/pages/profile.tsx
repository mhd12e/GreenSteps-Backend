import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { UserProfileResponse, UserProfileUpdateRequest } from '@/types';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Loader2, User, AlertTriangle } from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 words'),
  age: z.coerce.number().min(3).max(120),
  interests: z.array(z.string()).min(1, 'Enter at least one interest'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { clearTokens } = useAuthStore();
  const navigate = useNavigate();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      full_name: '',
      age: 18,
      interests: [],
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get<unknown, UserProfileResponse>('/users/me/profile');
        form.reset({
            full_name: data.full_name,
            age: data.age || 18,
            interests: data.interests,
        });
      } catch (error) {
        console.error("Failed to fetch profile", error);
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [form]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const payload: UserProfileUpdateRequest = {
        full_name: data.full_name,
        age: data.age,
        interests: data.interests,
      };

      await api.patch('/users/me/profile', payload);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Failed to update profile.';
      toast.error(msg);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/auth/account');
      toast.success("Account deleted successfully. We'll miss you!");
      clearTokens();
      navigate('/login');
    } catch (err: any) {
        console.error("Delete account failed", err);
        const msg = err.response?.data?.error?.message || "Failed to delete account";
        toast.error(msg);
    } finally {
        setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8">
      <Card className="clean-card bg-card">
        <CardHeader className="text-center pb-8 pt-6">
            <div className="mx-auto bg-primary/10 w-25 h-25 rounded-full flex items-center justify-center mb-4">
                <User className="w-16 h-16 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground">
              Your Profile
            </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        placeholder="Add new interest..."
                        className="bg-transparent border border-input focus-within:ring-primary/20"
                      />
                    </FormControl>
                    <FormDescription>Press Enter or comma to add tags</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                  type="submit" 
                  className="alive-button w-full font-bold py-6 text-lg mt-4" 
                  disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <div className="border border-red-200 bg-red-50/50 rounded-2xl overflow-hidden">
        <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 text-red-700 mb-4">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Danger Zone</h3>
            </div>
            <p className="text-red-600/80 mb-6 text-sm leading-relaxed">
                Deleting your account is permanent and cannot be undone. All your impact plans, 
                progress history, and personal data will be immediately erased from our servers.
            </p>
            <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
                className="w-full sm:w-auto bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
                Delete My Account
            </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="clean-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount}
              className="bg-[#ef4444] text-white border border-red-600 hover:bg-[#dc2626] rounded-xl shadow-lg shadow-red-500/20 transition-all duration-300"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
