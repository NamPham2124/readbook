'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ReaderHeader } from '@/components/reader/ReaderHeader';
import { PdfViewer } from '@/components/reader/PdfViewer';
import { EpubViewer } from '@/components/reader/EpubViewer';
import { TableOfContents } from '@/components/reader/TableOfContents';
import { NotesSidebar } from '@/components/reader/NotesSidebar';
import { HighlightsSidebar } from '@/components/reader/HighlightsSidebar';
import { TagsSidebar } from '@/components/reader/TagsSidebar';
import { TranslationPopup } from '@/components/reader/TranslationPopup';
import { Loader2, Edit3, Highlighter, Tag as TagIcon } from 'lucide-react';
import type {
  Book,
  Note,
  Highlight,
  Bookmark,
  Tag,
  BookTag,
  HighlightRect,
  Vocabulary,
} from '@/lib/types/database';
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

  // Translation Mode & Popup State
  const [translateMode, setTranslateMode] = useState(false);
  const [translationPopup, setTranslationPopup] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
  });

  // Annotation Data State
  const [toc, setToc] = useState<any[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [bookTags, setBookTags] = useState<BookTag[]>([]);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);

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

        // Fetch annotations and vocabularies in parallel
        const [notesRes, highlightsRes, bookmarksRes, tagsRes, bookTagsRes, vocabRes] = await Promise.all([
          fetch(`/api/annotations/notes?book_id=${bookId}`).then((r) => r.json()),
          fetch(`/api/annotations/highlights?book_id=${bookId}`).then((r) => r.json()),
          fetch(`/api/annotations/bookmarks?book_id=${bookId}`).then((r) => r.json()),
          fetch(`/api/annotations/tags`).then((r) => r.json()),
          fetch(`/api/annotations/tags?book_id=${bookId}`).then((r) => r.json()),
          fetch(`/api/vocabularies?book_id=${bookId}`).then((r) => r.json()),
        ]);

        if (notesRes.notes) setNotes(notesRes.notes);
        if (highlightsRes.highlights) setHighlights(highlightsRes.highlights);
        if (bookmarksRes.bookmarks) setBookmarks(bookmarksRes.bookmarks);
        if (tagsRes.tags) setTags(tagsRes.tags);
        if (bookTagsRes.book_tags) setBookTags(bookTagsRes.book_tags);
        if (vocabRes.vocabularies) setVocabularies(vocabRes.vocabularies);
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

  // 3. Translation Mode & Popup Handlers
  const handleToggleTranslateMode = () => {
    setTranslateMode((prev) => {
      const nextState = !prev;
      if (nextState) {
        toast.info('Chế độ Dịch Thuật ĐÃ BẬT. Hãy bôi đen một từ hoặc đoạn text để dịch.');
      } else {
        setTranslationPopup((p) => ({ ...p, visible: false }));
        toast.info('Đã tắt Chế độ Dịch Thuật.');
      }
      return nextState;
    });
  };

  const handleTranslateSelection = (text: string, clientX: number, clientY: number) => {
    setTranslationPopup({
      visible: true,
      x: clientX,
      y: clientY,
      selectedText: text,
    });
  };

  const handleCancelTranslation = () => {
    setTranslationPopup((prev) => ({ ...prev, visible: false }));
  };

  // 4. Vocabulary CRUD Handlers
  const handleAddVocabulary = async (vocab: {
    word: string;
    ipa: string | null;
    translation: string;
    page_number: number;
  }) => {
    const res = await fetch('/api/vocabularies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        page_number: vocab.page_number,
        word: vocab.word,
        ipa: vocab.ipa,
        translation: vocab.translation,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save vocabulary');

    setVocabularies((prev) => [...prev, data.vocabulary]);

    // Ensure right sidebar is open on notes tab so user sees the new entry
    setShowRightSidebar(true);
    setRightActiveTab('notes');
  };

  const handleSaveFromPopup = async (vocab: {
    word: string;
    ipa: string | null;
    translation: string;
    page_number: number;
  }) => {
    await handleAddVocabulary(vocab);
    setTranslationPopup((prev) => ({ ...prev, visible: false }));
  };

  const handleUpdateVocabulary = async (
    id: string,
    updates: { word?: string; ipa?: string | null; translation?: string }
  ) => {
    const res = await fetch(`/api/vocabularies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update vocabulary');

    setVocabularies((prev) => prev.map((v) => (v.id === id ? data.vocabulary : v)));
  };

  const handleDeleteVocabulary = async (id: string) => {
    const res = await fetch(`/api/vocabularies/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete vocabulary');

    setVocabularies((prev) => prev.filter((v) => v.id !== id));
  };

  // 5. Annotations Handlers
  const handleSaveNote = async (pageNumber: number, noteContent: string) => {
    const res = await fetch('/api/annotations/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        page_number: pageNumber,
        content: noteContent,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save note');

    setNotes((prev) => {
      const filtered = prev.filter((n) => n.page_number !== pageNumber);
      if (noteContent.trim()) {
        return [...filtered, data.note];
      }
      return filtered;
    });
  };

  const handleAddHighlight = async (highlightData: {
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
        ...highlightData,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save highlight');

    setHighlights((prev) => [...prev, data.highlight]);
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    const res = await fetch(`/api/annotations/highlights?id=${highlightId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete highlight');
    }

    setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    toast.success('Highlight removed');
  };

  const handleAddBookmark = async (pageNumber: number, label?: string) => {
    const res = await fetch('/api/annotations/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        page_number: pageNumber,
        label: label || `Page ${pageNumber}`,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add bookmark');
    setBookmarks((prev) => [...prev, data.bookmark]);
    toast.success(`Bookmarked page ${pageNumber}`);
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    const res = await fetch(`/api/annotations/bookmarks?id=${bookmarkId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete bookmark');
    }
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    toast.success('Bookmark removed');
  };

  const handleToggleBookmark = async (pageNumber: number) => {
    const existing = bookmarks.find((b) => b.page_number === pageNumber);
    if (existing) {
      await handleDeleteBookmark(existing.id);
    } else {
      await handleAddBookmark(pageNumber);
    }
  };

  const handleCreateTag = async (name: string, color?: string): Promise<Tag | null> => {
    const res = await fetch('/api/annotations/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color: color || '#89b4fa' }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Failed to create tag');
      return null;
    }
    setTags((prev) => [...prev, data.tag]);
    return data.tag;
  };

  const handleAssignTag = async (tagId: string, pageNumber: number) => {
    const res = await fetch('/api/annotations/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: bookId,
        tag_id: tagId,
        page_number: pageNumber,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to assign tag');
    setBookTags((prev) => [...prev, data.book_tag]);
    toast.success('Tag assigned');
  };

  const handleRemoveBookTag = async (tagId: string, pageNumber?: number) => {
    const pageParam = pageNumber ? `&page_number=${pageNumber}` : '';
    const res = await fetch(
      `/api/annotations/tags?book_id=${bookId}&tag_id=${tagId}${pageParam}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to remove tag');
    }
    setBookTags((prev) =>
      prev.filter((bt) => !(bt.tag_id === tagId && (!pageNumber || bt.page_number === pageNumber)))
    );
    toast.success('Tag removed');
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs/textareas
      if (
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handlePageChange(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePageChange(currentPage - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'b' || e.key === 'B') {
        handleToggleBookmark(currentPage);
      } else if (e.key === 't' || e.key === 'T') {
        handleToggleTranslateMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, handlePageChange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-mocha-base flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-mocha-blue" />
        <p className="text-sm font-semibold text-mocha-subtext0">Opening book in Reader...</p>
      </div>
    );
  }

  if (error || !book || !fileUrl) {
    return (
      <div className="min-h-screen bg-mocha-base flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-4 bg-mocha-red/10 border border-mocha-red/20 rounded-2xl text-mocha-red text-sm font-bold max-w-md">
          {error || 'Unable to open this book. Please try again.'}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-mocha-surface0 hover:bg-mocha-surface1 text-mocha-text rounded-xl text-xs font-bold transition-colors"
        >
          Reload Page
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-mocha-base text-mocha-text overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'
      }`}
    >
      {/* Reader Toolbar */}
      <ReaderHeader
        title={book.title}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        scale={scale}
        onScaleChange={setScale}
        onFitWidth={() => setScale(1.4)}
        onFitPage={() => setScale(1.0)}
        onRotate={() => setRotation((r) => (r + 90) % 360)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
        showLeftSidebar={showLeftSidebar}
        onToggleLeftSidebar={() => setShowLeftSidebar((prev) => !prev)}
        showRightSidebar={showRightSidebar}
        onToggleRightSidebar={() => setShowRightSidebar((prev) => !prev)}
        rightActiveTab={rightActiveTab}
        translateMode={translateMode}
        onToggleTranslateMode={handleToggleTranslateMode}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Table of Contents & Bookmarks */}
        {showLeftSidebar && (
          <div className="w-64 sm:w-72 bg-mocha-mantle border-r border-mocha-surface0 flex flex-col h-full shrink-0 select-none">
            <TableOfContents
              toc={toc}
              bookmarks={bookmarks}
              currentPage={currentPage}
              onJumpToPage={handlePageChange}
              onAddBookmark={handleAddBookmark}
              onDeleteBookmark={handleDeleteBookmark}
            />
          </div>
        )}

        {/* Central Book Viewer (PDF.js or EPUB.js) */}
        {fileType === 'epub' ? (
          <EpubViewer
            fileUrl={fileUrl}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onTotalPagesLoaded={setTotalPages}
            onExtractToc={setToc}
            highlights={highlights}
            translateMode={translateMode}
            onTranslateSelection={handleTranslateSelection}
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
            translateMode={translateMode}
            onTranslateSelection={handleTranslateSelection}
          />
        )}

        {/* Floating Translation Popup */}
        <TranslationPopup
          visible={translationPopup.visible}
          x={translationPopup.x}
          y={translationPopup.y}
          selectedText={translationPopup.selectedText}
          currentPage={currentPage}
          onSave={handleSaveFromPopup}
          onCancel={handleCancelTranslation}
        />

        {/* Right Sidebar: Notes, Vocabulary, Highlights, Tags */}
        {showRightSidebar && (
          <div className="w-80 sm:w-96 bg-mocha-mantle border-l border-mocha-surface0 flex flex-col h-full shrink-0 select-none">
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
                <Edit3 className="w-3.5 h-3.5" /> Ghi Chú & Từ Vựng
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
                  vocabularies={vocabularies}
                  onSaveNote={handleSaveNote}
                  onJumpToPage={handlePageChange}
                  onAddVocabulary={handleAddVocabulary}
                  onUpdateVocabulary={handleUpdateVocabulary}
                  onDeleteVocabulary={handleDeleteVocabulary}
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
