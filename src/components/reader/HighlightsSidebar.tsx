'use client';

import React from 'react';
import { Highlighter, Trash2, ChevronRight } from 'lucide-react';
import type { Highlight } from '@/lib/types/database';

interface HighlightsSidebarProps {
  highlights: Highlight[];
  currentPage: number;
  onJumpToPage: (page: number) => void;
  onDeleteHighlight: (highlightId: string) => Promise<void>;
}

export function HighlightsSidebar({
  highlights,
  currentPage,
  onJumpToPage,
  onDeleteHighlight,
}: HighlightsSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-mocha-mantle p-3 space-y-3 overflow-y-auto select-none">
      <div className="flex items-center justify-between pb-2 border-b border-mocha-surface0">
        <h3 className="text-xs font-bold text-mocha-text flex items-center gap-1.5">
          <Highlighter className="w-3.5 h-3.5 text-mocha-yellow" /> Highlights ({highlights.length})
        </h3>
      </div>

      {highlights.length === 0 ? (
        <div className="text-center py-10 text-xs text-mocha-overlay1 space-y-1">
          <p>No highlights yet.</p>
          <p className="text-[10px] text-mocha-overlay0">
            Select any text in the book to highlight it.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {highlights.map((hl) => (
            <div
              key={hl.id}
              onClick={() => onJumpToPage(hl.page_number)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                hl.page_number === currentPage
                  ? 'bg-mocha-surface0 border-mocha-yellow/40'
                  : 'bg-mocha-base/60 hover:bg-mocha-surface0/60 border-mocha-surface0'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: hl.color }}
                  />
                  <span className="text-[11px] font-bold text-mocha-text">Page {hl.page_number}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteHighlight(hl.id);
                  }}
                  className="text-mocha-overlay1 hover:text-mocha-red p-1 rounded transition-colors"
                  title="Delete highlight"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-mocha-subtext0 italic line-clamp-3 leading-relaxed border-l-2 pl-2 border-mocha-surface1">
                "{hl.selected_text}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
