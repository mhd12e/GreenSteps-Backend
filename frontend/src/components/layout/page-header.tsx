import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function PageHeader({ title, description, icon: Icon, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
          {Icon && <Icon className="w-8 h-8 text-primary" />}
          {title}
        </h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {action && <div className="w-full md:w-auto">{action}</div>}
    </div>
  );
}
