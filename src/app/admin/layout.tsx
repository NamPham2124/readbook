import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { Shield, Users, BookOpen, Settings, ArrowLeft } from 'lucide-react';
import type { Profile } from '@/lib/types/database';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const prof = profile as unknown as Profile | null;
  if (!prof || prof.role !== 'admin' || !prof.is_active) {
    redirect('/library');
  }

  return (
    <div className="min-h-screen bg-mocha-base flex flex-col">
      <Navbar profile={(profile as unknown as Profile) || null} />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Admin Navigation Sidebar */}
        <aside className="w-full md:w-60 shrink-0 space-y-2">
          <div className="p-3 bg-mocha-mantle border border-mocha-surface0 rounded-2xl space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-mocha-mauve flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Admin Portal
            </div>

            <nav className="space-y-0.5">
              <Link
                href="/admin"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0/60 transition-colors"
              >
                <Shield className="w-4 h-4 text-mocha-mauve" /> System Overview
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0/60 transition-colors"
              >
                <Users className="w-4 h-4 text-mocha-blue" /> User Management
              </Link>
              <Link
                href="/admin/books"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0/60 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-mocha-green" /> Global Books
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0/60 transition-colors"
              >
                <Settings className="w-4 h-4 text-mocha-yellow" /> System Settings
              </Link>
            </nav>
          </div>

          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-mocha-subtext0 hover:text-mocha-blue transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Library
          </Link>
        </aside>

        {/* Main Admin Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
