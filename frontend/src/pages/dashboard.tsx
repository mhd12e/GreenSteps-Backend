import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { UserProfileResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, Bot, ArrowRight, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<UserProfileResponse | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get<unknown, UserProfileResponse>('/users/me/profile');
        setUser(data);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };
    fetchProfile();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-12 pb-20 pt-8">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-4 max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Welcome to GreenSteps</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          Hello, <span className="text-primary">{user?.full_name?.split(' ')[0] || 'Friend'}</span>!
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Ready to make a positive impact? Explore our AI-powered tools designed to help you live sustainably and save resources.
        </p>
      </motion.div>

      {/* Main Apps Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
      >
        {/* Impact AI Card */}
        <motion.div variants={itemVariants} className="h-full">
            <Card className="clean-card h-full flex flex-col relative overflow-hidden group border-primary/20 hover:border-primary/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Leaf className="w-32 h-32 text-primary" />
                </div>
                <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                        <Leaf className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl">Impact AI</CardTitle>
                    <CardDescription className="text-base">
                        Generate personalized step-by-step sustainability plans tailored to your goals.
                    </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-6">
                    <Button asChild size="lg" className="alive-button w-full text-lg font-semibold group-hover:scale-[1.02] transition-transform">
                        <Link to="/impacts">
                            Launch Impact AI <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </motion.div>

        {/* Material AI Card */}
        <motion.div variants={itemVariants} className="h-full">
            <Card className="clean-card h-full flex flex-col relative overflow-hidden group border-teal-500/20 hover:border-teal-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Bot className="w-32 h-32 text-teal-600" />
                </div>
                <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-4 text-teal-600">
                        <Bot className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl">Material AI</CardTitle>
                    <CardDescription className="text-base">
                        Analyze materials and products for eco-friendliness using advanced computer vision.
                    </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-6">
                    <Button asChild variant="outline" size="lg" className="w-full text-lg font-semibold border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800">
                        <Link to="/materials">
                            Explore Material AI <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </motion.div>
      </motion.div>

      {/* Features / Stats Teaser */}
      <motion.div 
        variants={itemVariants}
        initial="hidden" 
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8"
      >
        <div className="flex flex-col items-center text-center p-4 bg-card/50 rounded-2xl border border-border/50">
            <div className="p-3 bg-yellow-100 text-yellow-700 rounded-full mb-3">
                <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground">Fast & AI-Powered</h3>
            <p className="text-sm text-muted-foreground">Instant actionable insights.</p>
        </div>
        <div className="flex flex-col items-center text-center p-4 bg-card/50 rounded-2xl border border-border/50">
            <div className="p-3 bg-green-100 text-green-700 rounded-full mb-3">
                <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground">Data Backed</h3>
            <p className="text-sm text-muted-foreground">Verified sustainability sources.</p>
        </div>
        <div className="flex flex-col items-center text-center p-4 bg-card/50 rounded-2xl border border-border/50">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-full mb-3">
                <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground">Gamified Progress</h3>
            <p className="text-sm text-muted-foreground">Earn badges as you grow.</p>
        </div>
      </motion.div>
    </div>
  );
}
