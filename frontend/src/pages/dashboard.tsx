import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { ImpactPayloadResponse, ImpactListResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Plus, ArrowRight, Loader2 } from 'lucide-react';

// Manually defining interface because types/index.ts might be slightly off with the dict/list thing
interface Impact extends ImpactPayloadResponse {}

export default function Dashboard() {
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImpacts = async () => {
      try {
        const listRes = await api.get<unknown, ImpactListResponse>('/impact');
        const ids = listRes.impact_ids;

        const detailsPromises = ids.map(id => 
            api.get<unknown, ImpactPayloadResponse>(`/impact/${id}`)
        );

        const details = await Promise.all(detailsPromises);
        setImpacts(details);
      } catch (error) {
        console.error("Failed to fetch impacts", error);
      } finally {
        setLoading(false);
      }
    };

    fetchImpacts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">My Impacts</h1>
        <Button asChild>
          <Link to="/impacts/generate">
            <Plus className="mr-2 h-4 w-4" /> Generate New
          </Link>
        </Button>
      </div>

      {impacts.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-lg border-2 border-dashed">
            <h3 className="text-xl font-semibold text-muted-foreground">No impacts yet</h3>
            <p className="text-muted-foreground mb-4">Start your journey by generating your first impact plan.</p>
            <Button asChild variant="secondary">
                <Link to="/impacts/generate">Generate Impact</Link>
            </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {impacts.map((impact) => (
            <Card key={impact.id} className="hover:shadow-lg transition-shadow border-primary/20">
              <CardHeader>
                <CardTitle className="line-clamp-1 text-primary">{impact.title}</CardTitle>
                <CardDescription className="line-clamp-2">{impact.descreption || impact.description}</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="text-sm text-muted-foreground">
                    {Object.keys(impact.steps).length} Steps
                 </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link to={`/impacts/${impact.id}`}>
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
