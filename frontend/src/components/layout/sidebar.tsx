import { NavLink } from 'react-router-dom';
import { Leaf, Bot, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/impacts', label: 'Impact AI', icon: Leaf },
  { to: '/materials', label: 'Material AI', icon: Bot },
];

interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Overview
        </h2>
        <div className="space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onLinkClick}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
                  isActive
                    ? "active bg-primary/10 text-primary font-bold ring-1 ring-primary/20 shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              {/* Active Indicator Bar */}
              <div className={cn(
                "absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full transition-transform duration-300",
                "scale-y-0 group-[.active]:scale-y-100"
              )} />
              
              <Icon className={cn(
                "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                "group-[.active]:text-primary"
              )} />
              {label}
            </NavLink>
          ))}
        </div>
      </div>
      
      <div className="px-3 py-2">
        <div className="rounded-xl bg-gradient-to-br from-primary/5 to-teal-500/5 p-4 border border-primary/10">
            <p className="text-xs text-muted-foreground font-medium mb-2">Pro Tip</p>
            <p className="text-xs text-foreground/80 leading-relaxed">
                Generate new impact plans regularly to keep your sustainability score high!
            </p>
        </div>
      </div>
    </div>
  );
}
