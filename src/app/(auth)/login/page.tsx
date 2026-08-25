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

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error('Vui lòng nhập tài khoản/email và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      // Normalize email (if user types 'admin', convert to 'admin@readbook.local')
      const cleanIdentifier = identifier.trim();
      const normalizedEmail = cleanIdentifier.includes('@')
        ? cleanIdentifier.toLowerCase()
        : `${cleanIdentifier.toLowerCase()}@readbook.local`;

      // Allow convenient 'admin' password shortcut
      let effectivePassword = password;
      if (normalizedEmail === 'admin@readbook.local' && password === 'admin') {
        effectivePassword = 'admin123456!';
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: effectivePassword,
      });

      if (error) {
        toast.error(error.message || 'Đăng nhập thất bại');
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
          toast.error('Tài khoản này đã bị khóa.');
          return;
        }

        toast.success('Đăng nhập thành công!');
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <Input
        label="Email hoặc Tên đăng nhập"
        type="text"
        placeholder="admin hoặc your.email@domain.com"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        leftIcon={<Mail className="w-4 h-4" />}
        required
        autoComplete="username"
      />

      <div className="space-y-1">
        <Input
          label="Mật khẩu"
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
            Quên mật khẩu?
          </Link>
        </div>
      </div>

      <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
        Đăng nhập
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Chào mừng trở lại"
      subtitle="Đăng nhập để đọc và quản lý thư viện sách"
      footerText="Chưa có tài khoản?"
      footerLinkText="Đăng ký tại đây"
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
