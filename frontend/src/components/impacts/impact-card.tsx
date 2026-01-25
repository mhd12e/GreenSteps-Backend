import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Map } from 'lucide-react';
import { motion } from 'framer-motion';
import { EntityActions } from '@/components/ui/action-dropdown';
import { ImpactPayloadResponse } from '@/types';

interface Impact extends ImpactPayloadResponse {}

interface ImpactCardProps {
  impact: Impact;
  onDelete: (id: string) => void;
  variants: any;
}

export function ImpactCard({ impact, onDelete, variants }: ImpactCardProps) {
  return (
    <motion.div 
        variants={variants}
        whileHover={{ scale: 1.02, y: -4 }}
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
          <CardFooter className="p-5 pt-0 flex justify-between items-center gap-2">
            <Button asChild className="alive-button flex-1 font-semibold">
                <Link to={`/impacts/${impact.id}`}>
                    View Details
                </Link>
            </Button>
            
            <EntityActions
              onDelete={() => onDelete(impact.id)}
              deleteTitle="Delete Impact Plan?"
              deleteDescription={`This will permanently delete your "${impact.title}" plan and all associated progress.`}
            />
          </CardFooter>
        </Card>
    </motion.div>
  );
}
