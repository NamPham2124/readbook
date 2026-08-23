'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Globe, User, Trash2, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { UploadBookModal } from '@/components/library/UploadBookModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatBytes, formatDate } from '@/lib/utils/cn';
import type { Book } from '@/lib/types/database';
import { toast } from 'sonner';

export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'global' | 'user'>('all');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      if (res.ok) setBooks(data.books || []);
    } catch {
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDeleteBook = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/books/${bookToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete book');

      toast.success(`"${bookToDelete.title}" deleted`);
      setBooks((prev) => prev.filter((b) => b.id !== bookToDelete.id));
      setBookToDelete(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase()) ||
      (b.author && b.author.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filter === 'global') return b.is_global;
    if (filter === 'user') return !b.is_global;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-mocha-text flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-mocha-green" /> Global & System Books
          </h1>
          <p className="text-xs text-mocha-subtext0 mt-0.5">
            Manage global books visible to all users and inspect uploaded books
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsUploadOpen(true)}
          className="gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" /> Upload Global Book
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mocha-overlay0 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, author, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-mocha-mantle border border-mocha-surface0 text-mocha-text text-xs rounded-xl focus:outline-none focus:border-mocha-blue"
          />
        </div>

        <div className="flex items-center bg-mocha-mantle border border-mocha-surface0 rounded-xl p-1 gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-mocha-surface0 text-mocha-blue'
                : 'text-mocha-subtext0 hover:text-mocha-text'
            }`}
          >
            All ({books.length})
          </button>
          <button
            onClick={() => setFilter('global')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'global'
                ? 'bg-mocha-surface0 text-mocha-mauve'
                : 'text-mocha-subtext0 hover:text-mocha-text'
            }`}
          >
            Global Only ({books.filter((b) => b.is_global).length})
          </button>
          <button
            onClick={() => setFilter('user')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'user'
                ? 'bg-mocha-surface0 text-mocha-green'
                : 'text-mocha-subtext0 hover:text-mocha-text'
            }`}
          >
            User Uploads ({books.filter((b) => !b.is_global).length})
          </button>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-mocha-mantle border border-mocha-surface0 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-mocha-subtext0">
            <thead className="bg-mocha-surface0/60 text-[11px] font-bold uppercase tracking-wider text-mocha-subtext1 border-b border-mocha-surface0">
              <tr>
                <th className="px-5 py-3.5">Book Title</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Scope</th>
                <th className="px-5 py-3.5">Size</th>
                <th className="px-5 py-3.5">Date Added</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mocha-surface0">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="w-48 h-4" /></td>
                    <td className="px-5 py-4"><Skeleton className="w-20 h-4" /></td>
                    <td className="px-5 py-4"><Skeleton className="w-16 h-4" /></td>
                    <td className="px-5 py-4"><Skeleton className="w-14 h-4" /></td>
                    <td className="px-5 py-4"><Skeleton className="w-20 h-4" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="w-12 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-mocha-overlay1">
                    No books found.
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-mocha-surface0/30 transition-colors">
                    {/* Title */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Badge variant={book.file_type === 'pdf' ? 'red' : 'purple'} size="sm">
                          {book.file_type.toUpperCase()}
                        </Badge>
                        <div className="min-w-0 max-w-sm">
                          <p className="font-bold text-mocha-text truncate">{book.title}</p>
                          <p className="text-[11px] text-mocha-overlay1 truncate">{book.author || 'Unknown'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 font-medium text-mocha-mauve">
                      {book.category}
                    </td>

                    {/* Scope */}
                    <td className="px-5 py-3.5">
                      {book.is_global ? (
                        <Badge variant="blue" className="normal-case">
                          <Globe className="w-2.5 h-2.5" /> Global
                        </Badge>
                      ) : (
                        <Badge variant="gray" className="normal-case">
                          <User className="w-2.5 h-2.5" /> User Book
                        </Badge>
                      )}
                    </td>

                    {/* Size */}
                    <td className="px-5 py-3.5 text-mocha-overlay1 whitespace-nowrap">
                      {formatBytes(book.file_size)}
                    </td>

                    {/* Added */}
                    <td className="px-5 py-3.5 text-mocha-overlay1 whitespace-nowrap">
                      {formatDate(book.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right space-x-1.5">
                      <Link
                        href={`/reader/${book.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded bg-mocha-surface0 hover:bg-mocha-blue hover:text-mocha-crust font-semibold text-mocha-text transition-colors"
                      >
                        Read
                      </Link>
                      <button
                        onClick={() => setBookToDelete(book)}
                        className="text-mocha-overlay1 hover:text-mocha-red p-1.5 rounded hover:bg-mocha-surface0 transition-colors"
                        title="Delete book"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Global Book Modal */}
      <UploadBookModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        isAdmin={true}
        onSuccess={fetchBooks}
      />

      {/* Delete Book Modal */}
      <ConfirmModal
        isOpen={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        onConfirm={handleDeleteBook}
        title="Delete Book"
        message={`Are you sure you want to permanently delete "${bookToDelete?.title}" from the cloud system?`}
        confirmText="Delete Book"
        isLoading={isDeleting}
      />
    </div>
  );
}
