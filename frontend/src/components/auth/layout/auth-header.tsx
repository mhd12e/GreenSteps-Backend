import logo from '@/assets/logo.png';
import { FeatureBadge } from '@/components/ui/feature-badge';
import { Sprout, Coins, Gamepad2, Bot } from 'lucide-react';

export function AuthHeader() {
  return (
    <div className="text-center mb-8 space-y-6 z-10 max-w-2xl w-full">
      <div className="flex flex-col items-center gap-4">
        {/* Logo Box */}
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-teal-900/5 border border-teal-100 transform hover:rotate-3 transition-transform duration-300">
          <img src={logo} alt="GreenSteps" className="w-10 h-10 object-contain" />
        </div>
        
        {/* Title & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">GreenSteps</h1>
          <p className="text-gray-500 text-lg font-medium">Learn sustainability. Save money. Save the planet.</p>
        </div>
      </div>

      {/* Feature Tags Row */}
      <div className="flex flex-wrap justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <FeatureBadge icon={Sprout} text="Track your eco impact" />
        <FeatureBadge icon={Coins} text="Save money sustainably" />
        <FeatureBadge icon={Gamepad2} text="Gamified learning" />
        <FeatureBadge icon={Bot} text="AI-powered coaching" />
      </div>
    </div>
  );
}
