'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ReaderHeader } from '@/components/reader/ReaderHeader';
import { PdfViewer } from '@/components/reader/PdfViewer';
import { EpubViewer } from '@/components/reader/EpubViewer';
import { TableOfContents } from '@/components/reader/TableOfContents';
import { NotesSidebar } from '@/components/reader/NotesSidebar';
import { HighlightsSidebar } from '@/components/reader/HighlightsSidebar';
import { TagsSidebar } from '@/components/reader/TagsSidebar';
import { Loader2, Edit3, Highlighter, Tag as TagIcon } from 'lucide-react';
import type { Book, Note, Highlight, Bookmark, Tag, BookTag, HighlightRect } from '@/lib/types/database';
import { toast } from 'sonner';

interface ReaderContainerProps {
  bookId: string;
}

export function ReaderContainer({ bookId }: ReaderContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Core Book & File State
  const [book, setBook] = useState<Book | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('pdf');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reader Viewport & Navigation State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sidebars State
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [rightActiveTab, setRightActiveTab] = useState<'notes' | 'highlights' | 'tags'>('notes');

  // Annotation Data State
  const [toc, setToc] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [bookTags, setBookTags] = useState<BookTag[]>([]);

  // 1. Initial Data Fetching
  useEffect(() => {
    async function loadBookData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch book metadata
        const bookRes = await fetch(`/api/books/${bookId}`);
        const bookData = await bookRes.json();
        if (!bookRes.ok) throw new Error(bookData.error || 'Failed to load book metadata');
        setBook(bookData.book);

        // Resume reading progress
        if (bookData.book.progress?.page_number) {
          setCurrentPage(bookData.book.progress.page_number);
        }

        // Fetch signed download URL
        const fileRes = await fetch(`/api/books/${bookId}/file`);
        const fileData = await fileRes.json();
        if (!fileRes.ok) throw new Error(fileData.error || 'Failed to access book file');
        setFileUrl(fileData.url);
        setFileType(fileData.file_type);

        // Fetch annotations in parallel
        const [notesRes, highlightsRes, bookmarksRes, tagsRes, bookTagsRes] = await Promise.all([
          fetch(`/api/annotations/notes?book_id=${bookId}`).then((r) => r.json()),
          fetch(`/api/annotations/highlights?book_id=${bookId}`).then((r) => r.json()),
          fetch(`/api/annotations/bookmarks?book_id=${bookId}`).then((r) => r.json()),
          fetch(`/api/annotations/tags`).then((r) => r.json()),
          fetch(`/api/annotations/tags?book_id=${bookId}`).then((r) => r.json()),
        ]);

        if (notesRes.notes) setNotes(notesRes.notes);
        if (highlightsRes.highlights) setHighlights(highlightsRes.highlights);
        if (bookmarksRes.bookmarks) setBookmarks(bookmarksRes.bookmarks);
        if (tagsRes.tags) setTags(tagsRes.tags);
        if (bookTagsRes.book_tags) setBookTags(bookTagsRes.book_tags);
      } catch (err: any) {
        setError(err.message || 'Error initializing reader');
      } finally {
        setLoading(false);
      }
    }

    loadBookData();
  }, [bookId]);

  // 2. Debounced Reading Progress Sync to Server
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handlePageChange = useCallback(
    (newPage: number) => {
      const page = Math.max(1, Math.min(newPage, totalPages || 1));
      setCurrentPage(page);

      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }

      progressTimerRef.current = setTimeout(async () => {
        const progressPercentage = totalPages > 1 ? (page / totalPages) * 100 : 0;
        try {
          await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              book_id: bookId,
              page_number: page,
              progress: progressPercentage,
            }),
          });
        } catch {}
      }, 1000);
    },
    [bookId, totalPages]
  );

  // 3. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handlePageChange(currentPage + 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale((prev) => Math.min(3.0, prev + 0.15));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setScale((prev) => Math.max(0.5, prev - 0.15));
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setShowRightSidebar(true);
        setRightActiveTab('notes');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setShowRightSidebar(true);
        setRightActiveTab('tags');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, handlePageChange]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Annotation handlers
  const handleSaveNote = async (pageNumber: number, content: string) => {
    const res = await fetch('/api/annotations/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        page_number: pageNumber,
        content,
      }),
    });
    const data = await res.json();
    if (res.ok && data.note) {
      setNotes((prev) => {
        const filtered = prev.filter((n) => n.page_number !== pageNumber);
        return [...filtered, data.note];
      });
    }
  };

  const handleAddHighlight = async (hl: {
    selected_text: string;
    page_number: number;
    rectangles: HighlightRect[];
    color: string;
  }) => {
    const res = await fetch('/api/annotations/highlights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        ...hl,
      }),
    });
    const data = await res.json();
    if (res.ok && data.highlight) {
      setHighlights((prev) => [...prev, data.highlight]);
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    const res = await fetch(`/api/annotations/highlights?id=${highlightId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    }
  };

  const handleAddBookmark = async (pageNumber: number, label?: string) => {
    const res = await fetch('/api/annotations/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        page_number: pageNumber,
        label,
      }),
    });
    const data = await res.json();
    if (res.ok && data.bookmark) {
      setBookmarks((prev) => [...prev, data.bookmark]);
      toast.success(`Bookmarked page ${pageNumber}`);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    const res = await fetch(`/api/annotations/bookmarks?id=${bookmarkId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
      toast.success('Bookmark removed');
    }
  };

  const handleCreateTag = async (name: string, color?: string): Promise<Tag | null> => {
    const res = await fetch('/api/annotations/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_tag',
        name,
        color,
      }),
    });
    const data = await res.json();
    if (res.ok && data.tag) {
      setTags((prev) => {
        if (!prev.some((t) => t.id === data.tag.id)) {
          return [...prev, data.tag];
        }
        return prev;
      });
      return data.tag;
    }
    return null;
  };

  const handleAssignTag = async (tagId: string, pageNumber: number) => {
    const res = await fetch('/api/annotations/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign_tag',
        book_id: bookId,
        tag_id: tagId,
        page_number: pageNumber,
      }),
    });
    const data = await res.json();
    if (res.ok && data.book_tag) {
      setBookTags((prev) => [...prev, data.book_tag]);
      toast.success('Tag assigned');
    }
  };

  const handleRemoveBookTag = async (tagId: string, pageNumber?: number) => {
    const params = new URLSearchParams({ book_id: bookId, tag_id: tagId });
    if (pageNumber) params.set('page_number', pageNumber.toString());

    const res = await fetch(`/api/annotations/tags?${params.toString()}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setBookTags((prev) =>
        prev.filter((bt) => !(bt.tag_id === tagId && (!pageNumber || bt.page_number === pageNumber)))
      );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-mocha-base flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-mocha-blue to-mocha-mauve flex items-center justify-center shadow-xl shadow-mocha-blue/20">
          <Loader2 className="w-6 h-6 animate-spin text-mocha-crust" />
        </div>
        <p className="text-sm font-semibold text-mocha-text">Opening book...</p>
      </div>
    );
  }

  if (error || !book || !fileUrl) {
    return (
      <div className="fixed inset-0 bg-mocha-base flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-4 bg-mocha-red/10 border border-mocha-red/20 rounded-2xl text-mocha-red text-sm font-semibold max-w-md">
          {error || 'Failed to open book'}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-mocha-base flex flex-col overflow-hidden z-50 select-none"
    >
      {/* Top Header */}
      <ReaderHeader
        title={book.title}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        scale={scale}
        onScaleChange={setScale}
        onFitWidth={() => setScale(1.4)}
        onFitPage={() => setScale(1.0)}
        onRotate={() => setRotation((prev) => (prev + 90) % 360)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={() => setShowLeftSidebar((prev) => !prev)}
        showRightSidebar={showRightSidebar}
        onToggleRightSidebar={() => setShowRightSidebar((prev) => !prev)}
        rightActiveTab={rightActiveTab}
      />

      {/* Main Reader Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: TOC & Bookmarks */}
        {showLeftSidebar && (
          <TableOfContents
            toc={toc}
            bookmarks={bookmarks}
            currentPage={currentPage}
            onJumpToPage={handlePageChange}
            onAddBookmark={handleAddBookmark}
            onDeleteBookmark={handleDeleteBookmark}
          />
        )}

        {/* Central Book Canvas Viewport */}
        {fileType === 'epub' ? (
          <EpubViewer
            fileUrl={fileUrl}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onTotalPagesLoaded={setTotalPages}
            onExtractToc={setToc}
            highlights={highlights}
          />
        ) : (
          <PdfViewer
            fileUrl={fileUrl}
            currentPage={currentPage}
            onTotalPagesLoaded={setTotalPages}
            scale={scale}
            rotation={rotation}
            highlights={highlights}
            onAddHighlight={handleAddHighlight}
            onDeleteHighlight={handleDeleteHighlight}
            onExtractToc={setToc}
          />
        )}

        {/* Right Sidebar: Notes, Highlights, Tags */}
        {showRightSidebar && (
          <div className="w-72 sm:w-80 bg-mocha-mantle border-l border-mocha-surface0 flex flex-col h-full shrink-0 select-none">
            {/* Sidebar Tab Switcher */}
            <div className="flex items-center border-b border-mocha-surface0 p-2 gap-1 bg-mocha-mantle">
              <button
                onClick={() => setRightActiveTab('notes')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  rightActiveTab === 'notes'
                    ? 'bg-mocha-surface0 text-mocha-blue'
                    : 'text-mocha-subtext0 hover:text-mocha-text'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Notes
              </button>

              <button
                onClick={() => setRightActiveTab('highlights')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  rightActiveTab === 'highlights'
                    ? 'bg-mocha-surface0 text-mocha-yellow'
                    : 'text-mocha-subtext0 hover:text-mocha-text'
                }`}
              >
                <Highlighter className="w-3.5 h-3.5" /> Highlights
              </button>

              <button
                onClick={() => setRightActiveTab('tags')}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  rightActiveTab === 'tags'
                    ? 'bg-mocha-surface0 text-mocha-mauve'
                    : 'text-mocha-subtext0 hover:text-mocha-text'
                }`}
              >
                <TagIcon className="w-3.5 h-3.5" /> Tags
              </button>
            </div>

            {/* Sidebar Content Panel */}
            <div className="flex-1 overflow-hidden">
              {rightActiveTab === 'notes' && (
                <NotesSidebar
                  currentPage={currentPage}
                  notes={notes}
                  onSaveNote={handleSaveNote}
                  onJumpToPage={handlePageChange}
                />
              )}

              {rightActiveTab === 'highlights' && (
                <HighlightsSidebar
                  highlights={highlights}
                  currentPage={currentPage}
                  onJumpToPage={handlePageChange}
                  onDeleteHighlight={handleDeleteHighlight}
                />
              )}

              {rightActiveTab === 'tags' && (
                <TagsSidebar
                  bookId={bookId}
                  currentPage={currentPage}
                  tags={tags}
                  bookTags={bookTags}
                  onCreateTag={handleCreateTag}
                  onAssignTag={handleAssignTag}
                  onRemoveBookTag={handleRemoveBookTag}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
