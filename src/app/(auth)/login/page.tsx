'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/library';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active, role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile && (profile as any).is_active === false) {
          await supabase.auth.signOut();
          toast.error('This account has been disabled by an administrator.');
          return;
        }

        toast.success('Logged in successfully!');
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <Input
        label="Email Address"
        type="email"
        placeholder="your.email@domain.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<Mail className="w-4 h-4" />}
        required
        autoComplete="email"
      />

      <div className="space-y-1">
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          required
          autoComplete="current-password"
        />
        <div className="flex justify-end pt-1">
          <Link
            href="/forgot-password"
            className="text-[11px] text-mocha-overlay1 hover:text-mocha-blue transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
        Sign In
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Sign in to access your personal and global books"
      footerText="Don't have an account yet?"
      footerLinkText="Register here"
      footerLinkHref="/register"
    >
      <Suspense
        fallback={
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-mocha-blue" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
