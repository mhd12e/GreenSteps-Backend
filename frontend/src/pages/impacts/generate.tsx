import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
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
      await api.post('/impact/generate', data);
      toast.success('Impact plan generated successfully!');
      navigate('/'); // Redirect to dashboard to see the new impact
    } catch (error) {
      console.error("Generation failed", error);
      toast.error('Failed to generate impact. Please try again.');
      form.setError('topic', { message: 'Failed to generate impact. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-primary">
            <Sparkles className="h-6 w-6" />
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
                    <FormLabel>What do you want to achieve?</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Reduce plastic usage, Start a community garden..." {...field} />
                    </FormControl>
                    <FormDescription>
                        Enter a topic or goal, and we'll generate a step-by-step plan for you.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Plan...
                    </>
                ) : (
                    'Generate Plan'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
