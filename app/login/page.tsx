'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { Recycle, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = mode === 'login' ? await signIn(email, password) : await signUp(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setError(null);
      setMode('login');
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-background to-accent/5 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Recycle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-semibold text-foreground text-base tracking-tight">WASTE CITY OS</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Smart Waste Platform</div>
            </div>
          </Link>

          <div className="max-w-md">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground leading-tight">
              The operating system for a city&apos;s waste ecosystem
            </h1>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Sign in to manage collections, fleet, containers, citizen reports, billing, and recycling — all in one platform.
            </p>
            <div className="flex flex-wrap gap-4 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-success" /> 1,847t managed monthly
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-info" /> 68.2% recycling rate
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            &copy; 2026 Waste City OS. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Recycle className="w-5 h-5 text-white" />
            </div>
            <div className="font-display font-semibold text-foreground tracking-tight">WASTE CITY OS</div>
          </div>

          <h2 className="font-display text-2xl font-semibold text-foreground">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            {mode === 'login'
              ? 'Sign in to access your dashboard'
              : 'Sign up to start managing your city\'s waste'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@city.gov"
                  className="w-full h-11 pl-10 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-primary font-medium hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Or explore the demo dashboard without signing in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
