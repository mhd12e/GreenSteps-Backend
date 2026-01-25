import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UploadCloud, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTitle } from '@/hooks/use-title';

const formSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  image: z.any()
    .refine((files) => files?.length === 1, "Image is required")
    .refine((files) => files?.[0]?.size <= 5 * 1024 * 1024, "Max file size is 5MB") 
});

export default function CreateMaterialPage() {
  useTitle('New Material');
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('image', values.image[0]);

        const res: any = await api.post('/materials/generate', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        // Response is Envelope<MaterialResponse>
        // api.ts unwrap -> returns MaterialResponse
        const materialId = res.id;
        
        toast.success("Material uploaded! AI is analyzing...");
        navigate(`/materials/${materialId}`);
    } catch (error: any) {
        console.error(error);
        toast.error("Failed to upload material");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, onChange: (files: FileList) => void) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
          onChange(files);
          setPreview(URL.createObjectURL(files[0]));
      }
  };

  const handleRemoveImage = (e: React.MouseEvent, onChange: (files: FileList | null) => void) => {
      e.preventDefault();
      e.stopPropagation();
      setPreview(null);
      onChange(null);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <Card className="clean-card bg-card">
        <CardHeader className="text-center pb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                <UploadCloud className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Upload Material</CardTitle>
            <p className="text-muted-foreground mt-2">
                Snap a photo of waste or recyclable items. Our AI will identify it and generate step-by-step upcycling projects.
            </p>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>What is it?</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Plastic Bottle, Old Jeans..." {...field} className="bg-transparent" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="image"
                        render={({ field: { onChange, value, ...rest } }) => (
                            <FormItem>
                                <FormLabel>Photo</FormLabel>
                                <FormControl>
                                    <div className="grid w-full items-center gap-1.5">
                                        <label 
                                            htmlFor="picture" 
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, onChange)}
                                            className={`
                                                flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 relative
                                                ${isDragging ? 'border-primary bg-primary/10 scale-102 shadow-lg' : 'border-input hover:bg-muted/50'}
                                                ${preview ? 'border-primary/50 bg-primary/5' : ''}
                                            `}
                                        >
                                            {preview ? (
                                                <>
                                                    <img src={preview} className="h-full w-full object-contain p-2" />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-md hover:scale-110 transition-transform"
                                                        onClick={(e) => handleRemoveImage(e, onChange)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                                                    <ImageIcon className={`w-8 h-8 mb-2 ${isDragging ? 'text-primary scale-110' : 'opacity-50'} transition-all`} />
                                                    <p className="text-sm font-medium">Click to upload or drag & drop</p>
                                                    <p className="text-xs opacity-50 mt-1">PNG, JPG up to 5MB</p>
                                                </div>
                                            )}
                                            <Input 
                                                id="picture" 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        onChange(e.target.files);
                                                        setPreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                                {...rest}
                                            />
                                        </label>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button 
                        type="submit" 
                        className="alive-button w-full py-6 text-lg font-bold mt-4"
                        disabled={form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                        ) : (
                            "Generate Ideas"
                        )}
                    </Button>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
