'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Library, Shield, LogOut, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { APP_NAME } from '@/lib/constants';
import type { Profile } from '@/lib/types/database';
import { toast } from 'sonner';

interface NavbarProps {
  profile: Profile | null;
}

export function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success('Signed out successfully.');
      router.push('/login');
      router.refresh();
    } catch (err: any) {
      toast.error('Failed to sign out.');
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full bg-mocha-mantle/80 backdrop-blur-md border-b border-mocha-surface0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/library" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-mocha-blue to-mocha-mauve flex items-center justify-center shadow-md shadow-mocha-blue/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-mocha-crust" />
            </div>
            <span className="font-extrabold text-lg text-mocha-text tracking-tight group-hover:text-mocha-blue transition-colors">
              {APP_NAME}
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/library"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/library'
                  ? 'bg-mocha-surface0 text-mocha-blue font-semibold'
                  : 'text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0/50'
              }`}
            >
              <Library className="w-4 h-4" /> Library
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-mocha-mauve/15 text-mocha-mauve font-semibold border border-mocha-mauve/30'
                    : 'text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0/50'
                }`}
              >
                <Shield className="w-4 h-4" /> Admin Dashboard
              </Link>
            )}
          </nav>
        </div>

        {/* Right actions: User info & logout */}
        <div className="flex items-center gap-3">
          {profile && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-mocha-surface0/50 border border-mocha-surface0">
              <div className="w-7 h-7 rounded-full bg-mocha-surface1 flex items-center justify-center text-xs font-bold text-mocha-blue">
                {profile.display_name?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-mocha-text leading-tight truncate max-w-[130px]">
                  {profile.display_name || profile.email.split('@')[0]}
                </span>
                <span className="text-[10px] text-mocha-overlay1 truncate max-w-[130px]">
                  {profile.email}
                </span>
              </div>
              {profile.role === 'admin' && <Badge variant="purple">Admin</Badge>}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-mocha-red hover:bg-mocha-red/15 hover:text-mocha-red gap-1.5"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
