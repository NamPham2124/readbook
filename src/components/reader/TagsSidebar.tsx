'use client';

import React, { useState } from 'react';
import { Tag as TagIcon, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Tag, BookTag } from '@/lib/types/database';

interface TagsSidebarProps {
  bookId: string;
  currentPage: number;
  tags: Tag[];
  bookTags: BookTag[];
  onCreateTag: (name: string, color?: string) => Promise<Tag | null>;
  onAssignTag: (tagId: string, pageNumber: number) => Promise<void>;
  onRemoveBookTag: (tagId: string, pageNumber?: number) => Promise<void>;
}

export function TagsSidebar({
  bookId,
  currentPage,
  tags,
  bookTags,
  onCreateTag,
  onAssignTag,
  onRemoveBookTag,
}: TagsSidebarProps) {
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const currentPageTagIds = new Set(
    bookTags.filter((bt) => bt.page_number === currentPage).map((bt) => bt.tag_id)
  );

  const handleCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setIsCreating(true);
    try {
      const createdTag = await onCreateTag(newTagName.trim());
      if (createdTag) {
        await onAssignTag(createdTag.id, currentPage);
        setNewTagName('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-mocha-mantle p-3 space-y-4 overflow-y-auto select-none">
      <div className="flex items-center justify-between pb-2 border-b border-mocha-surface0">
        <h3 className="text-xs font-bold text-mocha-text flex items-center gap-1.5">
          <TagIcon className="w-3.5 h-3.5 text-mocha-mauve" /> Page {currentPage} Tags
        </h3>
      </div>

      {/* Active Tags on this page */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-mocha-subtext0 uppercase tracking-wider">
          Tags on Current Page:
        </span>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {bookTags
            .filter((bt) => bt.page_number === currentPage)
            .map((bt) => {
              const tagObj = tags.find((t) => t.id === bt.tag_id) || bt.tag;
              if (!tagObj) return null;
              return (
                <span
                  key={`${bt.tag_id}-${bt.page_number}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-mocha-surface0 border border-mocha-surface1 text-mocha-text"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tagObj.color || '#89b4fa' }}
                  />
                  {tagObj.name}
                  <button
                    onClick={() => onRemoveBookTag(bt.tag_id, currentPage)}
                    className="text-mocha-overlay1 hover:text-mocha-red ml-0.5"
                    title="Remove tag from page"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
        </div>
      </div>

      {/* Add New Tag */}
      <form onSubmit={handleCreateAndAssign} className="space-y-2 pt-2 border-t border-mocha-surface0">
        <span className="text-[11px] font-semibold text-mocha-subtext0 uppercase tracking-wider">
          Add Tag:
        </span>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="e.g. SLAM, Important..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="flex-1 px-2.5 py-1.5 bg-mocha-base border border-mocha-surface0 text-mocha-text text-xs rounded-lg focus:outline-none focus:border-mocha-blue"
          />
          <Button type="submit" size="sm" variant="primary" isLoading={isCreating} className="h-8 px-2.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>

      {/* Available existing tags to quickly click */}
      {tags.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-mocha-surface0">
          <span className="text-[11px] font-semibold text-mocha-subtext0 uppercase tracking-wider">
            All Your Tags:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const isAssigned = currentPageTagIds.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (isAssigned) {
                      onRemoveBookTag(t.id, currentPage);
                    } else {
                      onAssignTag(t.id, currentPage);
                    }
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    isAssigned
                      ? 'bg-mocha-mauve/20 border-mocha-mauve/40 text-mocha-mauve'
                      : 'bg-mocha-surface0/60 border-mocha-surface0 text-mocha-subtext0 hover:text-mocha-text'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
