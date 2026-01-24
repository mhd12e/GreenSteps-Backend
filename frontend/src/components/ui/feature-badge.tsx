import { LucideIcon } from 'lucide-react';

interface FeatureBadgeProps {
  icon: LucideIcon;
  text: string;
}

export function FeatureBadge({ icon: Icon, text }: FeatureBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 text-sm font-medium text-gray-700 hover:scale-105 transition-transform duration-200 cursor-default">
      <Icon className="w-4 h-4 text-teal-600" />
      <span>{text}</span>
    </div>
  );
}
