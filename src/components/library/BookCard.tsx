'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Trash2, Globe, User, Clock, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatBytes, formatDate } from '@/lib/utils/cn';
import type { Book } from '@/lib/types/database';

interface BookCardProps {
  book: Book;
  currentUserId?: string;
  isAdmin?: boolean;
  onDelete: (bookId: string) => Promise<void>;
}

export function BookCard({ book, currentUserId, isAdmin, onDelete }: BookCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = isAdmin || (book.owner_id === currentUserId && !book.is_global);
  const progressPercent = Math.round(book.progress?.progress || 0);
  const currentPage = book.progress?.page_number || 1;

  // Aesthetic deterministic gradient generator
  const getGradient = (str: string) => {
    const gradients = [
      'from-blue-900/60 to-indigo-950/80 border-mocha-blue/30 text-mocha-blue',
      'from-purple-900/60 to-slate-950/80 border-mocha-mauve/30 text-mocha-mauve',
      'from-emerald-900/60 to-teal-950/80 border-mocha-green/30 text-mocha-green',
      'from-amber-900/60 to-stone-950/80 border-mocha-yellow/30 text-mocha-yellow',
      'from-rose-900/60 to-zinc-950/80 border-mocha-red/30 text-mocha-red',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
    return gradients[Math.abs(hash) % gradients.length];
  };

  const gradientClass = getGradient(book.category + book.title);

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
      <div className="group relative bg-mocha-mantle/70 hover:bg-mocha-surface0/60 border border-mocha-surface0 hover:border-mocha-blue/40 rounded-2xl p-4 transition-all duration-200 shadow-lg hover:shadow-glow-cyan flex flex-col justify-between overflow-hidden">
        {/* Top Cover Visual */}
        <Link href={`/reader/${book.id}`} className="block relative mb-3">
          <div
            className={`w-full h-44 rounded-xl bg-gradient-to-br ${gradientClass} border flex flex-col items-center justify-center p-4 text-center relative overflow-hidden transition-transform duration-200 group-hover:scale-[1.02] shadow-inner`}
          >
            {/* Book Spine 3D simulation line */}
            <div className="absolute left-2.5 top-0 bottom-0 w-1 bg-white/10 rounded-full" />

            {/* Badges on cover */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              <Badge variant={book.file_type === 'pdf' ? 'red' : 'purple'} size="sm">
                {book.file_type.toUpperCase()}
              </Badge>
              {book.is_global ? (
                <Badge variant="blue" size="sm" className="gap-1 normal-case font-semibold">
                  <Globe className="w-2.5 h-2.5" /> Global
                </Badge>
              ) : (
                <Badge variant="gray" size="sm" className="gap-1 normal-case">
                  <User className="w-2.5 h-2.5" /> Mine
                </Badge>
              )}
            </div>

            <BookOpen className="w-10 h-10 mb-2 opacity-80" />
            <h4 className="text-xs font-bold line-clamp-3 text-mocha-text max-w-[90%] leading-tight drop-shadow-sm">
              {book.title}
            </h4>
            {book.author && book.author !== 'Unknown' && (
              <p className="text-[11px] text-mocha-subtext0 line-clamp-1 mt-1 font-medium">
                {book.author}
              </p>
            )}
          </div>
        </Link>

        {/* Info & Category */}
        <div className="space-y-2.5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <span className="text-[11px] font-semibold text-mocha-mauve bg-mocha-mauve/10 px-2 py-0.5 rounded border border-mocha-mauve/20 truncate">
                {book.category}
              </span>
              <span className="text-[11px] text-mocha-overlay1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> {formatBytes(book.file_size)}
              </span>
            </div>

            <Link href={`/reader/${book.id}`} className="block">
              <h3 className="text-sm font-bold text-mocha-text line-clamp-1 group-hover:text-mocha-blue transition-colors">
                {book.title}
              </h3>
            </Link>
          </div>

          {/* Reading Progress Indicator */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-mocha-subtext0 font-medium">
              <span>{progressPercent > 0 ? `Page ${currentPage}` : 'Not started'}</span>
              <span className="text-mocha-blue font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-mocha-surface1 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-mocha-blue to-mocha-sapphire transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-mocha-surface0/60 mt-1">
            <Link
              href={`/reader/${book.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-mocha-blue hover:text-mocha-sapphire transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {progressPercent > 0 ? 'Continue' : 'Read Now'}
            </Link>

            {canDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeleteModal(true);
                }}
                className="text-mocha-overlay1 hover:text-mocha-red p-1 rounded transition-colors"
                title="Delete book"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Book"
        message={`Are you sure you want to delete "${book.title}"? All notes, highlights, and bookmarks associated with this book will be removed.`}
        confirmText="Delete Book"
        isLoading={isDeleting}
      />
    </>
  );
}
