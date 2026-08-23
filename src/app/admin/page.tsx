'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, BookOpen, Globe, User, Edit3, Highlighter, HardDrive, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { formatBytes } from '@/lib/utils/cn';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (res.ok) setStats(data.stats);
      } catch {}
      finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const cards = [
    {
      title: 'Total Registered Users',
      value: stats?.totalUsers ?? 0,
      sub: `${stats?.activeUsers ?? 0} active accounts`,
      icon: Users,
      color: 'text-mocha-blue bg-mocha-blue/15 border-mocha-blue/20',
      href: '/admin/users',
    },
    {
      title: 'Total Books in System',
      value: stats?.totalBooks ?? 0,
      sub: `${stats?.globalBooks ?? 0} global, ${stats?.userUploadedBooks ?? 0} user uploads`,
      icon: BookOpen,
      color: 'text-mocha-green bg-mocha-green/15 border-mocha-green/20',
      href: '/admin/books',
    },
    {
      title: 'Global Library Books',
      value: stats?.globalBooks ?? 0,
      sub: 'Visible to all users',
      icon: Globe,
      color: 'text-mocha-mauve bg-mocha-mauve/15 border-mocha-mauve/20',
      href: '/admin/books',
    },
    {
      title: 'Total Annotations',
      value: (stats?.totalNotes || 0) + (stats?.totalHighlights || 0),
      sub: `${stats?.totalNotes ?? 0} notes, ${stats?.totalHighlights ?? 0} highlights`,
      icon: Highlighter,
      color: 'text-mocha-yellow bg-mocha-yellow/15 border-mocha-yellow/20',
    },
    {
      title: 'Cloud Storage Used',
      value: stats ? formatBytes(stats.totalStorageBytes) : '0 MB',
      sub: 'Supabase Storage bucket: books',
      icon: HardDrive,
      color: 'text-mocha-red bg-mocha-red/15 border-mocha-red/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-mocha-text flex items-center gap-2">
          <Shield className="w-5 h-5 text-mocha-mauve" /> System Overview
        </h1>
        <p className="text-xs text-mocha-subtext0 mt-0.5">
          ReadBook cloud health, users, storage usage, and activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-5 bg-mocha-mantle rounded-2xl border border-mocha-surface0 space-y-3">
                <Skeleton className="w-1/3 h-4" />
                <Skeleton className="w-1/2 h-8" />
                <Skeleton className="w-2/3 h-3" />
              </div>
            ))
          : cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="p-5 bg-mocha-mantle/70 border border-mocha-surface0 rounded-2xl space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-mocha-subtext0">{card.title}</span>
                    <div className={`p-2 rounded-xl border ${card.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-mocha-text">{card.value}</div>
                    <p className="text-[11px] text-mocha-overlay1 mt-0.5">{card.sub}</p>
                  </div>

                  {card.href && (
                    <div className="pt-2 border-t border-mocha-surface0/60">
                      <Link
                        href={card.href}
                        className="text-xs font-semibold text-mocha-blue hover:underline"
                      >
                        Manage &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
      </div>

      {/* Quick Action Banner */}
      <div className="p-5 bg-gradient-to-r from-mocha-blue/10 to-mocha-mauve/10 border border-mocha-surface0 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-mocha-text">Manage Global Library</h3>
          <p className="text-xs text-mocha-subtext0">
            Upload new books for the entire user community or import books from local directory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/books">
            <Button variant="primary" size="sm">
              Manage Global Books
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="secondary" size="sm">
              Manage Users
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
