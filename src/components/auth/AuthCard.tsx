import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerLinkHref?: string;
}

export function AuthCard({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-mocha-crust relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-mocha-blue/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-mocha-mauve/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-mocha-base/90 border border-mocha-surface0 rounded-2xl shadow-2xl p-8 backdrop-blur-xl z-10 space-y-6">
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-mocha-blue to-mocha-mauve flex items-center justify-center shadow-lg shadow-mocha-blue/20">
            <BookOpen className="w-6 h-6 text-mocha-crust" />
          </div>
          <h1 className="text-xl font-extrabold text-mocha-text tracking-tight">{APP_NAME}</h1>
          <p className="text-xs text-mocha-subtext0 font-medium">{subtitle}</p>
        </div>

        <div className="border-t border-mocha-surface0 pt-4">
          <h2 className="text-base font-bold text-mocha-text mb-4 text-center">{title}</h2>
          {children}
        </div>

        {footerText && footerLinkHref && footerLinkText && (
          <div className="border-t border-mocha-surface0 pt-4 text-center text-xs text-mocha-subtext0">
            {footerText}{' '}
            <Link
              href={footerLinkHref}
              className="text-mocha-blue font-semibold hover:underline transition-colors"
            >
              {footerLinkText}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
