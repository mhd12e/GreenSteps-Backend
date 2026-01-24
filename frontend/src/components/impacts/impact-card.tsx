import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowRight, Map, MoreVertical, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImpactPayloadResponse } from '@/types';

interface Impact extends ImpactPayloadResponse {}

interface ImpactCardProps {
  impact: Impact;
  onDeleteRequest: (id: string) => void;
  variants: any;
}

export function ImpactCard({ impact, onDeleteRequest, variants }: ImpactCardProps) {
  return (
    <motion.div 
        variants={variants}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
        <Card className="clean-card h-full flex flex-col overflow-hidden group relative">
          <CardHeader>
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Map className="w-6 h-6" />
                </div>
            </div>
            <CardTitle className="line-clamp-1 text-xl font-bold text-foreground group-hover:text-primary transition-colors pr-8">
                {impact.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-muted-foreground">
                {impact.descreption || impact.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
             <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="bg-secondary px-2 py-1 rounded-md text-secondary-foreground">
                    {Object.keys(impact.steps).length} Steps
                </span>
             </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button asChild variant="outline" className="flex-1 rounded-xl border-border bg-card hover:bg-secondary/50 hover:text-foreground transition-all">
              <Link to={`/impacts/${impact.id}`}>
                View Details <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl border-border bg-card hover:bg-secondary/50 transition-all">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border border-border shadow-xl p-1">
                <DropdownMenuItem 
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive rounded-md transition-colors"
                  onClick={() => onDeleteRequest(impact.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="font-semibold">Delete Impact</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardFooter>
        </Card>
    </motion.div>
  );
}
