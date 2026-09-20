'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        setLoading(false);
        return;
      }

      router.push('/chat');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-indigo/90 backdrop-blur-xl border border-hairline/80 rounded-xl p-8 shadow-card animation-fadeIn">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mb-3 shadow-glow">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            ShrutiPagluChat
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Welcome back! Log in to continue chatting.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-canvas/80 border border-hairline rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-ink-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-link hover:underline transition-all"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-canvas/80 border border-hairline rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-ink-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-medium py-3.5 rounded-lg shadow-glow transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-hairline">
          <p className="text-sm text-ink-muted">
            Need an account?{' '}
            <Link
              href="/signup"
              className="text-green hover:underline font-medium transition-all"
            >
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
