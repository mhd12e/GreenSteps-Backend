import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/lib/api';
import { MaterialWay } from '@/types';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTitle } from '@/hooks/use-title';

import { BackButton } from '@/components/ui/back-button';

export default function WayDetailPage() {
  const { id, wayId } = useParams<{ id: string; wayId: string }>();
  const [way, setWay] = useState<MaterialWay | null>(null);
  const [loading, setLoading] = useState(true);

  // Since we don't have a direct /ways/{id} endpoint (nested in material), 
  // we fetch material and find the way. 
  // Optimization: Backend could have /materials/ways/{id} but fetching parent is fine.
  useEffect(() => {
    const fetchWay = async () => {
        try {
            // Assuming /materials/{id} returns ways list
            // Or better, we should have a specific endpoint or just filter client side for now
            // I'll filter client side from material detail endpoint
            const data: any = await api.get(`/materials/${id}`);
            const found = data.ways.find((w: any) => w.id === wayId);
            setWay(found);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchWay();
  }, [id, wayId]);

  useTitle(way?.title || 'Guide');

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!way) return <div>Not found</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
        <BackButton to={`/materials/${id}`} label="Back to Plans" />

        <div className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border">
            <div className="aspect-video relative bg-muted">
                {way.image_uri && (
                    <img src={way.image_uri} alt={way.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                    <h1 className="text-4xl font-bold text-white mb-2">{way.title}</h1>
                    <p className="text-white/90 text-lg line-clamp-2 max-w-2xl">{way.description}</p>
                </div>
            </div>

            <div className="p-8 md:p-12 bg-white">
                <article className="prose prose-lg prose-green max-w-none 
                    prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground
                    prose-li:text-muted-foreground prose-img:rounded-xl">
                    <ReactMarkdown>{way.md}</ReactMarkdown>
                </article>
            </div>
        </div>
    </div>
  );
}
