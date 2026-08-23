'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Trash2, Globe, User, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatBytes } from '@/lib/utils/cn';
import type { Book } from '@/lib/types/database';

interface BookListItemProps {
  book: Book;
  currentUserId?: string;
  isAdmin?: boolean;
  onDelete: (bookId: string) => Promise<void>;
}

export function BookListItem({ book, currentUserId, isAdmin, onDelete }: BookListItemProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = isAdmin || (book.owner_id === currentUserId && !book.is_global);
  const progressPercent = Math.round(book.progress?.progress || 0);

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(book.id);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="group bg-mocha-mantle/70 hover:bg-mocha-surface0/60 border border-mocha-surface0 hover:border-mocha-blue/40 rounded-xl p-3.5 transition-all duration-150 flex items-center justify-between gap-4">
        <Link href={`/reader/${book.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="w-10 h-12 rounded-lg bg-gradient-to-tr from-mocha-blue/20 to-mocha-mauve/20 border border-mocha-surface1 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-mocha-blue" />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-mocha-text truncate group-hover:text-mocha-blue transition-colors">
                {book.title}
              </h3>
              <Badge variant={book.file_type === 'pdf' ? 'red' : 'purple'} size="sm">
                {book.file_type.toUpperCase()}
              </Badge>
              {book.is_global ? (
                <Badge variant="blue" size="sm" className="hidden sm:inline-flex normal-case">
                  <Globe className="w-2.5 h-2.5" /> Global
                </Badge>
              ) : (
                <Badge variant="gray" size="sm" className="hidden sm:inline-flex normal-case">
                  <User className="w-2.5 h-2.5" /> Mine
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-mocha-subtext0">
              <span className="text-mocha-mauve font-medium">{book.category}</span>
              <span>•</span>
              {book.author && book.author !== 'Unknown' && (
                <>
                  <span className="truncate max-w-[150px]">{book.author}</span>
                  <span>•</span>
                </>
              )}
              <span className="text-mocha-overlay1">{formatBytes(book.file_size)}</span>
            </div>
          </div>
        </Link>

        {/* Progress & Actions */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden md:flex flex-col items-end gap-1 w-28">
            <div className="text-[11px] font-semibold text-mocha-blue">{progressPercent}% read</div>
            <div className="w-full h-1.5 bg-mocha-surface1 rounded-full overflow-hidden">
              <div
                className="h-full bg-mocha-blue rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Link
            href={`/reader/${book.id}`}
            className="px-3 py-1.5 rounded-lg bg-mocha-surface0 hover:bg-mocha-blue hover:text-mocha-crust text-xs font-semibold text-mocha-text transition-colors"
          >
            Read
          </Link>

          {canDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-mocha-overlay1 hover:text-mocha-red p-1.5 rounded transition-colors"
              title="Delete book"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Book"
        message={`Are you sure you want to delete "${book.title}"?`}
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </>
  );
}
