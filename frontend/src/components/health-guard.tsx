import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WifiOff, RefreshCw } from 'lucide-react';

export function HealthGuard({ children }: { children: React.ReactNode }) {
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      // Direct axios call might be better to avoid interceptor noise, but api instance is fine for public route
      // We expect 200 OK.
      await api.get('/system/health');
      setIsBackendDown(false);
      setCountdown(10); // Reset countdown for next time
    } catch (error) {
      console.error("Health check failed", error);
      setIsBackendDown(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Standard polling when backend is UP
  useEffect(() => {
    if (isBackendDown) return; // Stop polling if down, switch to retry logic

    const intervalId = setInterval(checkHealth, 7000);
    return () => clearInterval(intervalId);
  }, [isBackendDown, checkHealth]);

  // Countdown and retry logic when backend is DOWN
  useEffect(() => {
    if (!isBackendDown) return;

    const timerId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          checkHealth(); // Auto retry
          return 10; // Reset
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isBackendDown, checkHealth]);

  const handleManualRetry = () => {
    setCountdown(10);
    checkHealth();
  };

  if (isBackendDown) {
    return (
      <>
        {/* Lock the app interaction underneath */}
        <div className="fixed inset-0 z-[40] bg-background/50 blur-sm pointer-events-none" aria-hidden="true">
            {children}
        </div>

        {/* Overlay Dialog */}
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <Card className="w-full max-w-md shadow-2xl border-destructive/20 animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="text-center">
              <div className="mx-auto bg-muted rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4">
                <WifiOff className="w-10 h-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold">Connection Lost</CardTitle>
              <CardDescription className="text-lg mt-2">
                We can't reach the GreenSteps servers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-muted-foreground">
                Please check your internet connection. We will automatically retry in <span className="font-mono font-bold text-primary text-xl">{countdown}</span> seconds.
              </p>
              
              <Button 
                size="lg" 
                className="w-full font-bold gap-2" 
                onClick={handleManualRetry}
                disabled={isChecking}
              >
                {isChecking ? (
                    <RefreshCw className="w-5 h-5 animate-spin" /> 
                ) : (
                    <RefreshCw className="w-5 h-5" />
                )}
                {isChecking ? 'Connecting...' : 'Retry Now'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
