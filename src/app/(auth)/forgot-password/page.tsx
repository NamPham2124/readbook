'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthCard } from '@/components/auth/AuthCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/api/auth/callback?next=/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSubmitted(true);
      toast.success('Password reset link sent to your email!');
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Enter your email to receive a password reset link"
      footerText="Remembered your password?"
      footerLinkText="Back to sign in"
      footerLinkHref="/login"
    >
      {submitted ? (
        <div className="text-center space-y-4 py-2">
          <div className="p-3 bg-mocha-green/10 border border-mocha-green/20 rounded-xl text-mocha-green text-xs font-medium">
            A password reset email has been sent to <strong>{email}</strong>. Please check your inbox.
          </div>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-mocha-blue hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <Input
            label="Registered Email"
            type="email"
            placeholder="your.email@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoComplete="email"
          />

          <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
            Send Reset Link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
