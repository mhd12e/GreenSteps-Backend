import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to: string;
  label: string;
  className?: string;
}

export function BackButton({ to, label, className = "mb-6 hover:bg-muted -ml-4" }: BackButtonProps) {
  return (
    <Button variant="ghost" asChild className={className}>
      <Link to={to}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        {label}
      </Link>
    </Button>
  );
}
