import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { ImpactResponse } from '@/types';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const generateSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters').max(200),
});

type GenerateFormValues = z.infer<typeof generateSchema>;

export default function GenerateImpactPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      topic: '',
    },
  });

  const onSubmit = async (data: GenerateFormValues) => {
    setLoading(true);
    try {
      const response = await api.post<unknown, ImpactResponse>('/impact/generate', data);
      toast.success('Impact plan generated successfully!');
      // Redirect to the new impact detail page with a flag for confetti
      navigate(`/impacts/${response.id}`, { state: { newImpact: true } });
    } catch (error: any) {
      console.error("Generation failed", error);
      const msg = error.response?.data?.error?.message || 'Failed to generate impact. Please try again.';
      toast.error(msg);
      form.setError('topic', { message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-4">
      <Button variant="ghost" asChild className="hover:bg-muted -ml-4 text-muted-foreground hover:text-foreground transition-colors">
        <Link to="/impacts"><ArrowLeft className="w-4 h-4 mr-2"/> Back to Impacts</Link>
      </Button>

      <Card className="clean-card bg-card p-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-foreground font-bold">
            <Sparkles className="h-6 w-6 text-primary" />
            Generate New Impact Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium text-lg">What do you want to achieve?</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Reduce plastic usage, Start a community garden..." 
                        {...field} 
                        className="bg-transparent border-input focus:ring-2 focus:ring-primary/20 transition-all text-base"
                      />
                    </FormControl>
                    <FormDescription>
                        Enter a topic or goal, and we'll generate a step-by-step plan for you.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="alive-button w-full rounded-full py-6 text-lg font-bold" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Plan...
                    </>
                ) : (
                    <>
                        <Sparkles className="mr-2 h-5 w-5" /> Generate Plan
                    </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
