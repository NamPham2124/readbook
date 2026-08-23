'use client';

import React, { useState } from 'react';
import { Bookmark, ListTree, Plus, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Bookmark as BookmarkType } from '@/lib/types/database';

interface TableOfContentsProps {
  toc: any[];
  bookmarks: BookmarkType[];
  currentPage: number;
  onJumpToPage: (page: number) => void;
  onAddBookmark: (page: number, label?: string) => Promise<void>;
  onDeleteBookmark: (bookmarkId: string) => Promise<void>;
}

export function TableOfContents({
  toc,
  bookmarks,
  currentPage,
  onJumpToPage,
  onAddBookmark,
  onDeleteBookmark,
}: TableOfContentsProps) {
  const [activeTab, setActiveTab] = useState<'toc' | 'bookmarks'>('toc');
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);

  const isCurrentPageBookmarked = bookmarks.some((b) => b.page_number === currentPage);

  const handleAddBookmark = async () => {
    try {
      await onAddBookmark(currentPage, bookmarkLabel.trim() || undefined);
      setBookmarkLabel('');
      setIsAddingBookmark(false);
    } catch {}
  };

  return (
    <div className="w-64 sm:w-72 bg-mocha-mantle border-r border-mocha-surface0 flex flex-col h-full shrink-0 select-none">
      {/* Header Tabs */}
      <div className="flex items-center border-b border-mocha-surface0 p-2 gap-1">
        <button
          onClick={() => setActiveTab('toc')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'toc'
              ? 'bg-mocha-surface0 text-mocha-blue'
              : 'text-mocha-subtext0 hover:text-mocha-text'
          }`}
        >
          <ListTree className="w-3.5 h-3.5" /> Contents
        </button>

        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'bookmarks'
              ? 'bg-mocha-surface0 text-mocha-mauve'
              : 'text-mocha-subtext0 hover:text-mocha-text'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" /> Bookmarks ({bookmarks.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {activeTab === 'toc' ? (
          toc.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-mocha-overlay1">
              No table of contents embedded in this document.
            </div>
          ) : (
            <div className="space-y-1">
              {toc.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (typeof item.page === 'number') {
                      onJumpToPage(item.page);
                    }
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-mocha-surface0 text-xs text-mocha-text flex items-center justify-between group transition-colors"
                >
                  <span className="truncate pr-2 group-hover:text-mocha-blue">{item.title}</span>
                  {item.page && (
                    <span className="text-[10px] text-mocha-overlay1 shrink-0">p. {item.page}</span>
                  )}
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {/* Quick Add Bookmark for Current Page */}
            {!isCurrentPageBookmarked ? (
              isAddingBookmark ? (
                <div className="p-2.5 bg-mocha-surface0/60 border border-mocha-surface1 rounded-xl space-y-2">
                  <input
                    type="text"
                    placeholder={`Label for Page ${currentPage}...`}
                    value={bookmarkLabel}
                    onChange={(e) => setBookmarkLabel(e.target.value)}
                    className="w-full px-2.5 py-1 bg-mocha-base border border-mocha-surface1 rounded-lg text-xs text-mocha-text focus:outline-none focus:border-mocha-blue"
                  />
                  <div className="flex items-center gap-1.5 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddingBookmark(false)}
                      className="h-7 text-xs px-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleAddBookmark}
                      className="h-7 text-xs px-2"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingBookmark(true)}
                  className="w-full text-xs gap-1.5 border-dashed border-mocha-surface1"
                >
                  <Plus className="w-3.5 h-3.5" /> Bookmark Page {currentPage}
                </Button>
              )
            ) : (
              <div className="p-2 bg-mocha-mauve/10 border border-mocha-mauve/20 rounded-lg text-center text-xs text-mocha-mauve font-semibold">
                ★ Page {currentPage} is bookmarked
              </div>
            )}

            {/* List of bookmarks */}
            {bookmarks.length === 0 ? (
              <p className="text-center text-xs text-mocha-overlay1 py-6">No bookmarks yet.</p>
            ) : (
              <div className="space-y-1.5">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    onClick={() => onJumpToPage(bm.page_number)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      bm.page_number === currentPage
                        ? 'bg-mocha-surface0 border-mocha-mauve/40 text-mocha-mauve'
                        : 'bg-mocha-base/60 hover:bg-mocha-surface0/60 border-mocha-surface0 text-mocha-text'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {bm.label || `Page ${bm.page_number}`}
                      </p>
                      <span className="text-[10px] text-mocha-subtext0">Page {bm.page_number}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBookmark(bm.id);
                      }}
                      className="text-mocha-overlay1 hover:text-mocha-red p-1 rounded transition-colors"
                      title="Delete bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
