import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Wrench } from 'lucide-react';
import { MaterialWay } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WayCardProps {
  materialId: string;
  way: MaterialWay;
  index: number;
  variants?: any;
}

export function WayCard({ materialId, way, index, variants }: WayCardProps) {
  return (
    <motion.div
      variants={variants}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Card className="clean-card overflow-hidden h-full flex flex-col group relative">
        <div className="aspect-video relative overflow-hidden bg-muted">
            {way.image_uri ? (
                <img 
                    src={way.image_uri} 
                    alt={way.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/30 text-muted-foreground">
                    <Wrench className="w-8 h-8 opacity-20" />
                </div>
            )}
            <div className="absolute top-0 left-0 bg-primary/90 text-primary-foreground px-3 py-1 text-xs font-bold rounded-br-xl backdrop-blur-sm">
                Option {index + 1}
            </div>
        </div>

        <CardContent className="p-4 md:p-5 flex-1">
            <h3 className="font-bold text-lg md:text-xl mb-2 group-hover:text-primary transition-colors">{way.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-3 md:line-clamp-4 leading-relaxed">
                {way.description}
            </p>
        </CardContent>

        <CardFooter className="p-4 md:p-5 pt-0">
            <Button asChild className="w-full alive-button group/btn font-semibold text-sm md:text-base">
                <Link to={`/materials/${materialId}/ways/${way.id}`}>
                    Try it out <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
