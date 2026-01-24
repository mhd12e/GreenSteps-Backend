import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { LogOut, User, Menu, X } from 'lucide-react';
import api from '@/lib/api';
import logo from '@/assets/logo.png';
import { Sidebar } from './layout/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function MainLayout() {
  const { clearTokens, refreshToken } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

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
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-in-out ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Sidebar Drawer */}
      <aside 
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-[80%] max-w-[300px] bg-white border-r shadow-2xl transform transition-transform duration-300 ease-out will-change-transform ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xl text-primary">
                    <img src={logo} alt="GreenSteps" className="w-8 h-8 object-contain" />
                    <span>GreenSteps</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                    <X className="h-5 w-5" />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <Sidebar onLinkClick={() => setIsMobileMenuOpen(false)} />
            </div>
        </div>
      </aside>

      <header className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex h-16 items-center gap-4 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden shrink-0"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>

          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary transition-transform hover:scale-105 mr-auto">
            <img src={logo} alt="GreenSteps" className="w-8 h-8 object-contain" />
            <span className="tracking-tight">GreenSteps</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild title="Profile" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
              <Link to="/profile">
                <User className="w-5 h-5" />
              </Link>
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowLogoutDialog(true)} 
                title="Logout" 
                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex">
        <aside className="hidden md:block w-64 border-r border-border bg-white/50 backdrop-blur-md fixed top-16 bottom-0 z-30 overflow-y-auto">
            <Sidebar />
        </aside>
        <main className="flex-1 md:pl-64">
            <div className="container mx-auto px-4 py-8">
                <Outlet />
            </div>
        </main>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="clean-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="bg-red-600 text-white border border-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-500/20 transition-all duration-300"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
