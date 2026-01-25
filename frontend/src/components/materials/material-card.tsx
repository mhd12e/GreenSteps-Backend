import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Loader2, CheckCircle2, AlertCircle, MoreVertical, Edit2 } from 'lucide-react';
import { Material } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MaterialCardProps {
  material: Material;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  variants?: any;
}

export function MaterialCard({ material, onDelete, onUpdateTitle, variants }: MaterialCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(material.title);
  
  const isProcessing = material.status === 'queued' || material.status === 'processing';
  const isFailed = material.status === 'failed';

  const handleUpdate = () => {
    if (newTitle.trim() && newTitle !== material.title) {
      onUpdateTitle(material.id, newTitle);
    }
    setIsEditDialogOpen(false);
  };

  return (
    <motion.div
      variants={variants}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Card className="clean-card overflow-hidden h-full flex flex-col group relative">
        {/* Cover Image */}
        <div className="aspect-video relative bg-muted">
            {material.image_uri ? (
                <img 
                    src={material.image_uri} 
                    alt={material.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    {isProcessing ? (
                        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                    ) : (
                        <div className="text-muted-foreground text-sm font-medium">No Image</div>
                    )}
                </div>
            )}
            
            {/* Status Badge */}
            <div className="absolute top-3 right-3">
                {isProcessing && <Badge variant="secondary" className="bg-white/90 backdrop-blur text-blue-600 shadow-sm"><Loader2 className="w-3 h-3 mr-1 animate-spin"/> Processing</Badge>}
                {isFailed && <Badge variant="destructive" className="shadow-sm"><AlertCircle className="w-3 h-3 mr-1"/> Failed</Badge>}
                {material.status === 'ready' && <Badge className="bg-white/90 backdrop-blur text-green-600 shadow-sm hover:bg-white"><CheckCircle2 className="w-3 h-3 mr-1"/> Ready</Badge>}
            </div>
        </div>

        <CardContent className="p-5 flex-1">
            <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">{material.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
                {material.description || (isProcessing ? "AI is analyzing this material..." : "No description available.")}
            </p>
        </CardContent>

        <CardFooter className="p-5 pt-0 flex justify-between items-center gap-2">
            <Button asChild variant="default" className="alive-button flex-1 font-semibold" disabled={isProcessing && !material.description}>
                <Link to={`/materials/${material.id}`}>
                    {isProcessing ? 'View Progress' : 'View Plans'}
                </Link>
            </Button>
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 bg-white border-border hover:bg-muted transition-colors"
                        disabled={isProcessing}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => {
                            setNewTitle(material.title);
                            setIsEditDialogOpen(true);
                        }}
                    >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit Title
                    </DropdownMenuItem>
                    
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onSelect={(e) => e.preventDefault()}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="clean-card border-border">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Material?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete "{material.title}" and all its generated recycling plans.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={() => onDelete(material.id)}
                                    className="bg-[#ef4444] text-white hover:bg-[#dc2626] rounded-xl"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardFooter>
      </Card>

      {/* Edit Title Dialog (using AlertDialog for structure) */}
      <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <AlertDialogContent className="clean-card border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Material Title</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new title for this material.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input 
              value={newTitle} 
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Material title"
              className="bg-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdate} className="alive-button rounded-xl px-6">
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
