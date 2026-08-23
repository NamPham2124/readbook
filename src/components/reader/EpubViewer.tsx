'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Highlight } from '@/lib/types/database';

interface EpubViewerProps {
  fileUrl: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPagesLoaded: (total: number) => void;
  onExtractToc?: (toc: any[]) => void;
  highlights: Highlight[];
}

export function EpubViewer({
  fileUrl,
  currentPage,
  onPageChange,
  onTotalPagesLoaded,
  onExtractToc,
}: EpubViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadEpub() {
      if (!viewerRef.current) return;
      try {
        setLoading(true);
        setError(null);

        // Dynamically import epubjs
        const ePub = (await import('epubjs')).default;
        const book = ePub(fileUrl);
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'always',
        });
        renditionRef.current = rendition;

        // Apply dark theme
        rendition.themes.default({
          body: {
            background: '#1e1e2e !important',
            color: '#cdd6f4 !important',
            'font-family': '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif !important',
            'line-height': '1.7 !important',
            padding: '24px 36px !important',
          },
          'p, span, div, h1, h2, h3, h4, h5, h6, li': {
            color: '#cdd6f4 !important',
          },
          a: {
            color: '#89b4fa !important',
          },
        });

        await rendition.display();

        // Load Table of Contents
        const navigation = await book.loaded.navigation;
        if (onExtractToc && navigation.toc) {
          onExtractToc(navigation.toc);
        }

        // Generate Locations for page count
        await book.locations.generate(1000);
        const total = (book.locations as any)?.total || (book.locations as any)?.length?.() || 100;
        if (!isCancelled) {
          onTotalPagesLoaded(total);
        }

        // Track page turns
        rendition.on('relocated', (location: any) => {
          if (!isCancelled && location && location.start) {
            const rawPage = (book.locations as any)?.locationFromCfi?.(location.start.cfi);
            const page = typeof rawPage === 'number' ? rawPage : parseInt(String(rawPage), 10) || 1;
            onPageChange(page);
          }
        });
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to render EPUB document');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadEpub();

    return () => {
      isCancelled = true;
      if (bookRef.current) {
        try {
          bookRef.current.destroy();
        } catch {}
      }
    };
  }, [fileUrl, onTotalPagesLoaded, onExtractToc, onPageChange]);

  return (
    <div className="flex-1 overflow-hidden bg-mocha-base flex flex-col items-center justify-center p-4 relative select-text">
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-mocha-base space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-mocha-blue" />
          <p className="text-xs text-mocha-subtext0 font-medium">Preparing EPUB reader...</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-mocha-red/10 border border-mocha-red/20 rounded-xl text-mocha-red text-xs font-semibold">
          {error}
        </div>
      )}

      <div
        ref={viewerRef}
        className="w-full max-w-4xl h-full rounded-2xl bg-mocha-mantle/50 border border-mocha-surface0 shadow-2xl overflow-hidden"
      />
    </div>
  );
}
