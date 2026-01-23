import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Leaf, LogOut } from 'lucide-react';
import api from '@/lib/api';

export function MainLayout() {
  const { clearTokens, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
        if (refreshToken) {
            await api.post('/auth/logout', { refresh_token: refreshToken });
        }
    } catch (e) {
        console.error("Logout failed", e);
    } finally {
        clearTokens();
        navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Leaf className="w-6 h-6 fill-primary" />
            <span>GreenSteps</span>
          </Link>
          <div className="flex items-center gap-4">
             {/* User profile could go here */}
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
