import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTitle } from '@/hooks/use-title';

export default function VerifyPage() {
  useTitle('Verify Email');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        return;
      }

      try {
        await api.get(`/auth/verify?token=${token}`);
        setStatus('success');
        toast.success('Email verified successfully!');
      } catch (error) {
        console.error('Verification failed', error);
        setStatus('error');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full clean-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-8">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Verifying your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="bg-primary/10 p-4 rounded-full mb-6">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Success!</h3>
              <p className="text-muted-foreground text-center mb-8">
                Your email has been verified. You can now access all features of GreenSteps.
              </p>
              <Button asChild className="alive-button w-full rounded-xl py-6 font-bold text-lg">
                <Link to="/login" replace>
                  Go to Login <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="bg-destructive/10 p-4 rounded-full mb-6">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <h3 className="text-xl font-bold mb-2">Verification Failed</h3>
              <div className="text-muted-foreground text-center mb-8 space-y-2">
                <p>The verification link is invalid, expired, or has already been used.</p>
                <p className="text-sm">
                    Links expire after 24 hours. If your link has expired, your unverified account may have been removed. 
                    Please try <Link to="/register" className="text-primary hover:underline font-medium">registering again</Link>.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full rounded-xl py-6 font-bold text-lg border-primary/20 text-primary">
                <Link to="/login" replace>Back to Login</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
