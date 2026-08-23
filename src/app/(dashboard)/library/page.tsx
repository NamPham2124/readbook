'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import { BookCard } from '@/components/library/BookCard';
import { BookListItem } from '@/components/library/BookListItem';
import { UploadBookModal } from '@/components/library/UploadBookModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { BookOpen, Globe, User, BookMarked, UploadCloud, Library as LibraryIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Book, Profile } from '@/lib/types/database';
import { toast } from 'sonner';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'global' | 'my' | 'reading'>('all');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // 1. Fetch current profile
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data as Profile);
      }
    }
    loadProfile();
  }, []);

  // 2. Fetch books
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'global') params.set('tab', 'global');
      if (activeTab === 'my') params.set('tab', 'my');
      if (category !== 'All') params.set('category', category);
      if (search.trim()) params.set('search', search.trim());
      params.set('sort', sort);

      const res = await fetch(`/api/books?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch books');
      }

      setBooks(data.books || []);
    } catch (err: any) {
      toast.error(err.message || 'Could not load library.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, category, search, sort]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Extract unique categories from loaded books
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    books.forEach((b) => {
      if (b.category) cats.add(b.category);
    });
    return Array.from(cats);
  }, [books]);

  // Filter for 'reading' tab
  const displayedBooks = useMemo(() => {
    if (activeTab === 'reading') {
      return books.filter((b) => (b.progress?.progress || 0) > 0);
    }
    return books;
  }, [books, activeTab]);

  const handleDeleteBook = async (bookId: string) => {
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete book');

      toast.success('Book deleted successfully');
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    } catch (err: any) {
      toast.error(err.message || 'Error deleting book');
    }
  };

  const tabs = [
    { id: 'all', label: 'All Books', icon: LibraryIcon },
    { id: 'global', label: 'Global Library', icon: Globe },
    { id: 'my', label: 'My Uploads', icon: User },
    { id: 'reading', label: 'Continue Reading', icon: BookMarked },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mocha-surface0 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-mocha-text tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-mocha-blue" />
            Library
          </h1>
          <p className="text-xs text-mocha-subtext0 mt-0.5">
            Manage your personal library and explore shared global books
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-mocha-mantle/80 border border-mocha-surface0 rounded-xl p-1 gap-1 self-start md:self-auto overflow-x-auto max-w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-mocha-surface0 text-mocha-blue shadow-sm'
                    : 'text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Controls */}
      <LibraryHeader
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        availableCategories={availableCategories}
        sort={sort}
        onSortChange={setSort}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Book Grid / List / Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4 bg-mocha-mantle/50 rounded-2xl border border-mocha-surface0">
              <Skeleton className="w-full h-44 rounded-xl" />
              <Skeleton className="w-1/3 h-4" />
              <Skeleton className="w-3/4 h-5" />
              <Skeleton className="w-full h-2" />
            </div>
          ))}
        </div>
      ) : displayedBooks.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-mocha-mantle/40 border border-mocha-surface0 rounded-3xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-mocha-surface0/60 border border-mocha-surface1 flex items-center justify-center text-mocha-blue shadow-lg">
            <BookOpen className="w-8 h-8 opacity-80" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-mocha-text">No Books Found</h3>
            <p className="text-xs text-mocha-subtext0 leading-relaxed">
              {search || category !== 'All'
                ? 'No books matched your filter criteria. Try clearing search filters.'
                : activeTab === 'reading'
                ? 'You have not started reading any books yet. Pick a book to begin!'
                : 'Your library is empty. Upload your first PDF or EPUB book to get started!'}
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsUploadOpen(true)} className="gap-2">
            <UploadCloud className="w-4 h-4" /> Upload New Book
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {displayedBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              currentUserId={profile?.id}
              isAdmin={profile?.role === 'admin'}
              onDelete={handleDeleteBook}
            />
          ))}
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-2.5">
          {displayedBooks.map((book) => (
            <BookListItem
              key={book.id}
              book={book}
              currentUserId={profile?.id}
              isAdmin={profile?.role === 'admin'}
              onDelete={handleDeleteBook}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadBookModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        isAdmin={profile?.role === 'admin'}
        onSuccess={fetchBooks}
      />
    </div>
  );
}
