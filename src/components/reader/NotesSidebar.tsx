'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Check, Loader2, FileText, ChevronRight } from 'lucide-react';
import type { Note } from '@/lib/types/database';

interface NotesSidebarProps {
  currentPage: number;
  notes: Note[];
  onSaveNote: (pageNumber: number, content: string) => Promise<void>;
  onJumpToPage: (page: number) => void;
}

export function NotesSidebar({
  currentPage,
  notes,
  onSaveNote,
  onJumpToPage,
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
    <div className="flex flex-col h-full bg-mocha-mantle select-none">
      {/* Header */}
      <div className="p-3 border-b border-mocha-surface0 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-mocha-surface0/60 p-0.5 rounded-lg">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'editor'
                ? 'bg-mocha-surface1 text-mocha-blue'
                : 'text-mocha-subtext0 hover:text-mocha-text'
            }`}
          >
            Page {currentPage} Note
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'all'
                ? 'bg-mocha-surface1 text-mocha-mauve'
                : 'text-mocha-subtext0 hover:text-mocha-text'
            }`}
          >
            All Notes ({notes.length})
          </button>
        </div>

        {activeTab === 'editor' && (
          <div className="flex items-center gap-1 text-[11px] text-mocha-subtext0">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-mocha-yellow">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-mocha-green">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            {saveStatus === 'unsaved' && <span className="text-mocha-overlay1">Unsaved</span>}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-3 overflow-y-auto">
        {activeTab === 'editor' ? (
          <div className="h-full flex flex-col space-y-2">
            <textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={`Write markdown notes for page ${currentPage}...\n\n- Key concepts\n- Formulas\n- Summary`}
              className="w-full flex-1 p-3 bg-mocha-base border border-mocha-surface0 rounded-xl text-xs text-mocha-text placeholder:text-mocha-overlay0 focus:outline-none focus:border-mocha-blue font-sans resize-none leading-relaxed"
            />
          </div>
        ) : (
          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-center text-xs text-mocha-overlay1 py-10">No notes written yet.</p>
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
                    <span className="text-[11px] font-bold text-mocha-blue">Page {note.page_number}</span>
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
