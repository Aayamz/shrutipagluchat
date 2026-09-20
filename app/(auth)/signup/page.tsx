'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, Lock, Mail, User, AtSign, Camera, ArrowRight, AlertCircle, Loader2, Check } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 400,
          useWebWorker: true,
        });
        setAvatarFile(compressedFile);
        setAvatarPreview(URL.createObjectURL(compressedFile));
      } catch (err) {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 alphanumeric characters or underscores.');
      setLoading(false);
      return;
    }

    try {
      // 1. Check username availability
      const { data: existingUser, error: checkErr } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        setError(`Username @${cleanUsername} is already taken. Please choose another.`);
        setLoading(false);
        return;
      }

      // 2. Upload avatar if selected
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${cleanUsername}-${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrlData.publicUrl;
        }
      }

      // 3. Supabase Auth Signup
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            display_name: displayName.trim(),
            avatar_url: avatarUrl,
          },
        },
      });

      if (signUpErr) {
        setError(signUpErr.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Logged in directly
        router.push('/chat');
        router.refresh();
      } else {
        setSuccessMsg('Account created! Please check your email inbox to confirm your address before logging in.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-indigo/90 backdrop-blur-xl border border-hairline/80 rounded-xl p-8 shadow-card animation-fadeIn">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-full bg-magenta/20 border border-magenta/40 flex items-center justify-center mb-2 shadow-glow">
            <MessageSquare className="w-7 h-7 text-magenta" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">
            Create Account
          </h1>
          <p className="text-ink-muted text-xs mt-1">
            Join ShrutiPagluChat and connect with friends instantly.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-lg bg-green/15 border border-green/30 text-green text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Avatar Picker */}
          <div className="flex flex-col items-center justify-center mb-2">
            <label className="relative cursor-pointer group">
              <div className="w-20 h-20 rounded-full bg-canvas border-2 border-hairline group-hover:border-primary transition-all flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-ink-muted group-hover:text-primary transition-all" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 border border-canvas shadow-md">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
            <span className="text-[11px] text-ink-muted mt-1">Upload Profile Picture (Optional)</span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
              Display Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Shruti"
                className="w-full bg-canvas/80 border border-hairline rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-ink-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
              Username <span className="text-red-400">*</span> (Unique for search)
            </label>
            <div className="relative">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="shruti_123"
                className="w-full bg-canvas/80 border border-hairline rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-ink-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-canvas/80 border border-hairline rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-ink-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-canvas/80 border border-hairline rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-ink-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green text-ink-dark font-semibold py-3 rounded-lg shadow-glow hover:bg-green-hover transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-hairline">
          <p className="text-xs text-ink-muted">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium transition-all"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
