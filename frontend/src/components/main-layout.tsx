import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import api from '@/lib/api';
import logo from '@/assets/logo.png';

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
      <header className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary transition-transform hover:scale-105">
            <img src={logo} alt="GreenSteps" className="w-8 h-8 object-contain" />
            <span className="tracking-tight">GreenSteps</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild title="Profile" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
              <Link to="/profile">
                <User className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
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
