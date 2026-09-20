'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, ArrowLeft, AlertCircle, Check, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetErr) {
        setError(resetErr.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Reset failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-indigo/90 backdrop-blur-xl border border-hairline/80 rounded-xl p-8 shadow-card animation-fadeIn">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-white mb-6 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Login</span>
        </Link>

        <h1 className="text-2xl font-display font-bold text-white mb-2">
          Reset Password
        </h1>
        <p className="text-ink-muted text-xs mb-6">
          Enter your registered email address and we will send you a password reset link.
        </p>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-lg bg-green/15 border border-green/30 text-green text-sm flex flex-col items-center text-center gap-2">
            <Check className="w-8 h-8 text-green" />
            <p className="font-semibold text-white">Reset Email Sent!</p>
            <p className="text-xs text-ink-muted">
              We have sent instructions to <strong>{email}</strong>. Please check your inbox and follow the link to reset your password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-lg shadow-glow transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
