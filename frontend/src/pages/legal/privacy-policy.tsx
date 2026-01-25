import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTitle } from '@/hooks/use-title';

export default function PrivacyPolicy() {
  useTitle('Privacy Policy');

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" asChild className="mb-8 hover:bg-muted -ml-4">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2"/> Back to Home</Link>
        </Button>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-8 sm:p-12">
          <h1 className="text-3xl font-extrabold text-foreground mb-8">Privacy Policy</h1>
          
          <div className="text-muted-foreground">
            <p className="mb-6 font-medium text-foreground">Last updated: {new Date().toLocaleDateString()}</p>

            <h3 className="text-xl font-bold mt-8 mb-4 text-foreground">1. Introduction</h3>
            <p className="mb-4 leading-relaxed">
              Your privacy is important to GreenSteps. This policy explains how we collect, use, and protect your information when you use our sustainability platform.
            </p>

            <h3 className="text-xl font-bold mt-8 mb-4 text-foreground">2. Data We Collect</h3>
            <p className="mb-4 leading-relaxed">
              To provide our AI-powered services, we collect and process the following data:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li><strong className="text-foreground">Account Information:</strong> Name, email, age, and interests provided during registration.</li>
              <li><strong className="text-foreground">Usage Activity:</strong> Data on how you interact with our dashboard, generated impacts, and material analysis tools.</li>
              <li><strong className="text-foreground">Voice & Chat Data:</strong> When using the Voice Coach feature, your audio and text inputs are recorded and processed.</li>
            </ul>

            <h3 className="text-xl font-bold mt-8 mb-4 text-foreground">3. How We Use Your Data</h3>
            <p className="mb-4 leading-relaxed">
              We use this data to:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Personalize your sustainability plans and recommendations.</li>
              <li>Improve the accuracy and responsiveness of our AI models.</li>
              <li>Monitor and enhance the overall user experience.</li>
            </ul>
            <p className="font-medium text-foreground mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
              We do NOT sell your personal data to third parties.
            </p>

            <h3 className="text-xl font-bold mt-8 mb-4 text-foreground">4. AI Processing & Third Parties</h3>
            <p className="mb-4 leading-relaxed">
              Our Voice Coach and generative features are powered by Google Gemini. By using these features, you acknowledge that your inputs (text and audio) are sent to Google for processing. 
            </p>
            <p className="mb-4 leading-relaxed">
              Google may retain this data for a limited period to improve their services. For more details on how Google handles data, please refer to the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Google Privacy Policy</a> and the <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Gemini API Terms</a>.
            </p>

            <h3 className="text-xl font-bold mt-8 mb-4 text-foreground">5. Data Retention</h3>
            <p className="mb-4 leading-relaxed">
              We retain your user logs and activity data indefinitely to provide historical impact tracking and to train our internal systems for better personalization. You may request account deletion at any time, which will anonymize your data.
            </p>

            <h3 className="text-xl font-bold mt-8 mb-4 text-foreground">6. Security</h3>
            <p className="mb-4 leading-relaxed">
              We implement standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.
            </p>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm">
                Questions? Contact us at <a href="mailto:mhd12@devlix.org" className="text-primary hover:underline font-medium">mhd12@devlix.org</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
