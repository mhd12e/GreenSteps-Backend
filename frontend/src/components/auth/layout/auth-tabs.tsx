import { cn } from '@/lib/utils';

interface AuthTabsProps {
  activeTab: 'login' | 'signup';
  onTabChange: (tab: 'login' | 'signup') => void;
}

export function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
  return (
    <div className="flex p-1 bg-gray-100 rounded-xl my-4 mx-6">
      <button
        onClick={() => onTabChange('login')}
        className={cn(
          "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200",
          activeTab === 'login' 
            ? "bg-teal-600 text-white shadow-md" 
            : "text-gray-500 hover:text-gray-900"
        )}
      >
        Login
      </button>
      <button
        onClick={() => onTabChange('signup')}
        className={cn(
          "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200",
          activeTab === 'signup' 
            ? "bg-teal-600 text-white shadow-md" 
            : "text-gray-500 hover:text-gray-900"
        )}
      >
        Sign Up
      </button>
    </div>
  );
}
