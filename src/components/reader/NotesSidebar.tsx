'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Check, Loader2, FileText, ChevronRight, BookA, Download, X } from 'lucide-react';
import type { Note, Vocabulary } from '@/lib/types/database';
import { VocabularyTable } from '@/components/reader/VocabularyTable';

interface NotesSidebarProps {
  currentPage: number;
  notes: Note[];
  vocabularies: Vocabulary[];
  onSaveNote: (pageNumber: number, content: string) => Promise<void>;
  onJumpToPage: (page: number) => void;
  onAddVocabulary: (vocab: {
    word: string;
    ipa: string | null;
    translation: string;
    page_number: number;
  }) => Promise<void>;
  onUpdateVocabulary: (
    id: string,
    updates: { word?: string; ipa?: string | null; translation?: string }
  ) => Promise<void>;
  onDeleteVocabulary: (id: string) => Promise<void>;
  onOpenExportModal?: () => void;
  onCloseSidebar?: () => void;
}

export function NotesSidebar({
  currentPage,
  notes,
  vocabularies,
  onSaveNote,
  onJumpToPage,
  onAddVocabulary,
  onUpdateVocabulary,
  onDeleteVocabulary,
  onOpenExportModal,
  onCloseSidebar,
}: NotesSidebarProps) {
  const currentNote = notes.find((n) => n.page_number === currentPage);
  const [content, setContent] = useState(currentNote?.content || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [activeTab, setActiveTab] = useState<'editor' | 'all'>('editor');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync content when currentPage changes
  useEffect(() => {
    const note = notes.find((n) => n.page_number === currentPage);
    setContent(note?.content || '');
    setSaveStatus('saved');
  }, [currentPage, notes]);

  const handleChange = (newVal: string) => {
    setContent(newVal);
    setSaveStatus('unsaved');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSaveNote(currentPage, newVal);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('unsaved');
      }
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-mocha-mantle select-none overflow-hidden">
      {/* Header */}
      <div className="p-2.5 border-b border-mocha-surface0 flex items-center justify-between shrink-0 gap-1.5">
        <div className="flex items-center gap-1 bg-mocha-surface0/60 p-0.5 rounded-lg">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'editor'
                ? 'bg-mocha-surface1 text-mocha-blue'
                : 'text-mocha-subtext0 hover:text-mocha-text'
            }`}
          >
            Trang {currentPage} Note
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'all'
                ? 'bg-mocha-surface1 text-mocha-mauve'
                : 'text-mocha-subtext0 hover:text-mocha-text'
            }`}
          >
            Tất cả ({notes.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'editor' && (
            <div className="flex items-center gap-1 text-[11px] text-mocha-subtext0">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-mocha-yellow">
                  <Loader2 className="w-3 h-3 animate-spin" /> Lưu...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-mocha-green">
                  <Check className="w-3 h-3" /> Đã lưu
                </span>
              )}
              {saveStatus === 'unsaved' && <span className="text-mocha-overlay1">Chưa lưu</span>}
            </div>
          )}

          {/* Export Notes Button */}
          {onOpenExportModal && (
            <button
              onClick={onOpenExportModal}
              className="p-1 rounded-lg text-mocha-blue hover:bg-mocha-blue/15 transition-colors"
              title="Xuất File Ghi Chú & Từ Vựng"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close / Hide Sidebar Button */}
          {onCloseSidebar && (
            <button
              onClick={onCloseSidebar}
              className="p-1 rounded-lg text-mocha-subtext0 hover:text-mocha-red hover:bg-mocha-surface0 transition-colors"
              title="Ẩn Bảng Ghi Chú (Phím tắt: N)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col space-y-4">
        {activeTab === 'editor' ? (
          <>
            {/* Section 1: Text Note Editor */}
            <div className="space-y-1.5 flex flex-col shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-mocha-text">
                <span className="flex items-center gap-1.5 text-mocha-blue">
                  <Edit3 className="w-3.5 h-3.5" /> Ghi Chú Văn Bản
                </span>
                <span className="text-[10px] text-mocha-overlay1">Markdown</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={`Ghi chú cho trang ${currentPage}...\n\n- Khái niệm chính\n- Tóm tắt`}
                rows={4}
                className="w-full p-2.5 bg-mocha-base border border-mocha-surface0 rounded-xl text-xs text-mocha-text placeholder:text-mocha-overlay0 focus:outline-none focus:border-mocha-blue font-sans resize-y min-h-[90px] leading-relaxed"
              />
            </div>

            <div className="h-px bg-mocha-surface0 shrink-0" />

            {/* Section 2: Vocabulary Table */}
            <div className="flex-1 min-h-[220px] flex flex-col">
              <VocabularyTable
                currentPage={currentPage}
                vocabularies={vocabularies}
                onAddVocabulary={onAddVocabulary}
                onUpdateVocabulary={onUpdateVocabulary}
                onDeleteVocabulary={onDeleteVocabulary}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-center text-xs text-mocha-overlay1 py-10">Chưa có ghi chú nào.</p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    onJumpToPage(note.page_number);
                    setActiveTab('editor');
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    note.page_number === currentPage
                      ? 'bg-mocha-surface0 border-mocha-blue/40'
                      : 'bg-mocha-base/60 hover:bg-mocha-surface0/50 border-mocha-surface0'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-mocha-blue">Trang {note.page_number}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-mocha-overlay1" />
                  </div>
                  <p className="text-xs text-mocha-subtext0 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
