'use client';

import React from 'react';
import { Settings, HardDrive, ShieldCheck, Database, FileCode, CheckCircle2 } from 'lucide-react';
import { MAX_BOOK_SIZE_MB, SUPPORTED_EXTENSIONS, APP_NAME } from '@/lib/constants';

export default function AdminSettingsPage() {
  const configs = [
    {
      title: 'Application Name',
      value: APP_NAME,
      desc: 'Configured via NEXT_PUBLIC_APP_NAME',
      icon: FileCode,
    },
    {
      title: 'Maximum Book Upload Size',
      value: `${MAX_BOOK_SIZE_MB} MB`,
      desc: 'Configured via MAX_BOOK_SIZE_MB',
      icon: HardDrive,
    },
    {
      title: 'Supported File Formats',
      value: SUPPORTED_EXTENSIONS.join(', '),
      desc: 'PDF, EPUB, MOBI, FB2, CBZ',
      icon: Database,
    },
    {
      title: 'Authentication & Security',
      value: 'Supabase Auth & Row Level Security',
      desc: 'Strict server-side validation & user data isolation',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-mocha-text flex items-center gap-2">
          <Settings className="w-5 h-5 text-mocha-yellow" /> System Settings & Configuration
        </h1>
        <p className="text-xs text-mocha-subtext0 mt-0.5">
          Review environment parameters, storage limits, and deployment status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((cfg, idx) => {
          const Icon = cfg.icon;
          return (
            <div
              key={idx}
              className="p-5 bg-mocha-mantle/70 border border-mocha-surface0 rounded-2xl space-y-2"
            >
              <div className="flex items-center gap-2.5 text-mocha-blue">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-bold text-mocha-text">{cfg.title}</span>
              </div>
              <p className="text-sm font-extrabold text-mocha-mauve">{cfg.value}</p>
              <p className="text-[11px] text-mocha-overlay1">{cfg.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Production Deployment Health Card */}
      <div className="p-5 bg-mocha-mantle border border-mocha-surface0 rounded-2xl space-y-3">
        <h3 className="text-sm font-bold text-mocha-text flex items-center gap-2 text-mocha-green">
          <CheckCircle2 className="w-4 h-4" /> Production Architecture Ready
        </h3>
        <ul className="text-xs text-mocha-subtext0 space-y-1.5 list-disc list-inside">
          <li><strong>Stateless Next.js Serverless:</strong> Compatible with Vercel edge & lambdas.</li>
          <li><strong>Object Storage:</strong> Persistent multi-user book storage in Supabase Storage.</li>
          <li><strong>Database:</strong> Supabase PostgreSQL with automated RLS policies on all tables.</li>
          <li><strong>Zero Local State on Vercel:</strong> Fully resilient to cold starts and redeployments.</li>
        </ul>
      </div>
    </div>
  );
}
