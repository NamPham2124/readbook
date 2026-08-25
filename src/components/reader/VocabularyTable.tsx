'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Volume2, BookA, Loader2, AlertCircle } from 'lucide-react';
import type { Vocabulary } from '@/lib/types/database';
import { toast } from 'sonner';

interface VocabularyTableProps {
  currentPage: number;
  vocabularies: Vocabulary[];
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
}

export function VocabularyTable({
  currentPage,
  vocabularies,
  onAddVocabulary,
  onUpdateVocabulary,
  onDeleteVocabulary,
}: VocabularyTableProps) {
  const pageVocabs = vocabularies.filter((v) => v.page_number === currentPage);

  // Add row form state
  const [isAdding, setIsAdding] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newIpa, setNewIpa] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);

  // Edit row state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState('');
  const [editIpa, setEditIpa] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Text to speech helper
  const handlePronounce = (text: string) => {
    if ('speechSynthesis' in window && text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewWord('');
    setNewIpa('');
    setNewTranslation('');
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newTranslation.trim()) {
      toast.error('Vui lòng nhập Từ và Bản dịch');
      return;
    }

    try {
      setAddingLoading(true);
      await onAddVocabulary({
        word: newWord.trim(),
        ipa: newIpa.trim() ? newIpa.trim() : null,
        translation: newTranslation.trim(),
        page_number: currentPage,
      });
      setIsAdding(false);
      setNewWord('');
      setNewIpa('');
      setNewTranslation('');
      toast.success('Đã thêm từ mới vào bảng');
    } catch (err: any) {
      toast.error(err.message || 'Thêm từ mới thất bại');
    } finally {
      setAddingLoading(false);
    }
  };

  const handleStartEdit = (vocab: Vocabulary) => {
    setEditingId(vocab.id);
    setEditWord(vocab.word);
    setEditIpa(vocab.ipa || '');
    setEditTranslation(vocab.translation);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editWord.trim() || !editTranslation.trim()) {
      toast.error('Từ và bản dịch không được để trống');
      return;
    }

    try {
      setEditLoading(true);
      await onUpdateVocabulary(id, {
        word: editWord.trim(),
        ipa: editIpa.trim() ? editIpa.trim() : null,
        translation: editTranslation.trim(),
      });
      setEditingId(null);
      toast.success('Đã cập nhật từ vựng');
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật thất bại');
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      setDeleteLoading(true);
      await onDeleteVocabulary(id);
      setDeletingId(null);
      toast.success('Đã xóa từ vựng');
    } catch (err: any) {
      toast.error(err.message || 'Xóa từ vựng thất bại');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-mocha-teal">
          <BookA className="w-4 h-4" />
          <span>Bảng Từ Vựng ({pageVocabs.length})</span>
        </div>

        {!isAdding && (
          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-mocha-crust bg-mocha-teal hover:bg-mocha-teal/90 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm từ
          </button>
        )}
      </div>

      {/* Inline Add Row Form */}
      {isAdding && (
        <form
          onSubmit={handleSaveAdd}
          className="p-2.5 bg-mocha-surface0/70 border border-mocha-teal/40 rounded-xl space-y-2 animate-in fade-in-50 duration-150"
        >
          <div className="text-[11px] font-bold text-mocha-teal">Thêm từ vựng mới (Trang {currentPage}):</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Từ (Word) *"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="text-xs px-2 py-1.5 bg-mocha-base border border-mocha-surface1 rounded-lg text-mocha-text focus:outline-none focus:border-mocha-teal"
              required
              autoFocus
            />
            <input
              type="text"
              placeholder="IPA (Tùy chọn)"
              value={newIpa}
              onChange={(e) => setNewIpa(e.target.value)}
              className="text-xs px-2 py-1.5 bg-mocha-base border border-mocha-surface1 rounded-lg text-mocha-mauve font-mono focus:outline-none focus:border-mocha-teal"
            />
            <input
              type="text"
              placeholder="Dịch nghĩa *"
              value={newTranslation}
              onChange={(e) => setNewTranslation(e.target.value)}
              className="text-xs px-2 py-1.5 bg-mocha-base border border-mocha-surface1 rounded-lg text-mocha-green focus:outline-none focus:border-mocha-teal"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              disabled={addingLoading}
              className="px-2.5 py-1 text-xs font-semibold text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface1 rounded-md transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={addingLoading}
              className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-mocha-crust bg-mocha-teal hover:bg-mocha-teal/90 rounded-md transition-colors shadow-sm"
            >
              {addingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Lưu
            </button>
          </div>
        </form>
      )}

      {/* Vocabulary Table with Internal Scrolling */}
      <div className="flex-1 overflow-y-auto border border-mocha-surface0 rounded-xl bg-mocha-base/40">
        {pageVocabs.length === 0 ? (
          <div className="p-6 text-center text-xs text-mocha-overlay1 space-y-1">
            <p className="font-medium">Chưa có từ vựng nào ở trang {currentPage}.</p>
            <p className="text-[11px]">Bật 🌐 Translate và bôi đen từ trong sách hoặc nhấn nút "Thêm từ".</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-mocha-surface0/60 border-b border-mocha-surface0 text-[11px] font-bold text-mocha-subtext0 sticky top-0 z-10 backdrop-blur-sm">
                <th className="py-2 px-3">Từ</th>
                <th className="py-2 px-3">IPA</th>
                <th className="py-2 px-3">Dịch</th>
                <th className="py-2 px-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mocha-surface0/40">
              {pageVocabs.map((vocab) => {
                const isEditing = editingId === vocab.id;
                const isDeleting = deletingId === vocab.id;

                if (isEditing) {
                  return (
                    <tr key={vocab.id} className="bg-mocha-surface0/40">
                      <td className="p-2">
                        <input
                          type="text"
                          value={editWord}
                          onChange={(e) => setEditWord(e.target.value)}
                          className="w-full text-xs px-2 py-1 bg-mocha-base border border-mocha-surface1 rounded text-mocha-text focus:outline-none focus:border-mocha-teal"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={editIpa}
                          onChange={(e) => setEditIpa(e.target.value)}
                          className="w-full text-xs px-2 py-1 bg-mocha-base border border-mocha-surface1 rounded text-mocha-mauve font-mono focus:outline-none focus:border-mocha-teal"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={editTranslation}
                          onChange={(e) => setEditTranslation(e.target.value)}
                          className="w-full text-xs px-2 py-1 bg-mocha-base border border-mocha-surface1 rounded text-mocha-green focus:outline-none focus:border-mocha-teal"
                        />
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleSaveEdit(vocab.id)}
                            disabled={editLoading}
                            className="p-1 rounded text-mocha-teal hover:bg-mocha-teal/20 transition-colors"
                            title="Lưu"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded text-mocha-subtext0 hover:bg-mocha-surface1 transition-colors"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={vocab.id} className="hover:bg-mocha-surface0/30 transition-colors group">
                    {/* Word Column */}
                    <td className="py-2.5 px-3 font-bold text-mocha-text">
                      <div className="flex items-center gap-1.5">
                        <span>{vocab.word}</span>
                        <button
                          onClick={() => handlePronounce(vocab.word)}
                          className="p-0.5 rounded text-mocha-overlay1 hover:text-mocha-blue transition-colors opacity-0 group-hover:opacity-100"
                          title="Phát âm"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* IPA Column */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {vocab.ipa ? (
                        <span className="text-mocha-mauve bg-mocha-mauve/10 px-1.5 py-0.5 rounded border border-mocha-mauve/20">
                          {vocab.ipa}
                        </span>
                      ) : (
                        <span className="text-mocha-overlay1 italic text-[10px]">IPA unavailable</span>
                      )}
                    </td>

                    {/* Translation Column */}
                    <td className="py-2.5 px-3 text-mocha-green font-medium">
                      {vocab.translation}
                    </td>

                    {/* Actions Column */}
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      {isDeleting ? (
                        <div className="flex items-center justify-end gap-1.5 animate-in fade-in duration-100">
                          <span className="text-[10px] text-mocha-red font-bold">Xóa?</span>
                          <button
                            onClick={() => handleConfirmDelete(vocab.id)}
                            disabled={deleteLoading}
                            className="px-1.5 py-0.5 bg-mocha-red text-mocha-crust rounded text-[10px] font-bold hover:bg-mocha-red/90 transition-colors"
                          >
                            Xác nhận
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-1.5 py-0.5 bg-mocha-surface1 text-mocha-subtext0 rounded text-[10px] hover:text-mocha-text transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(vocab)}
                            className="p-1 rounded text-mocha-subtext0 hover:text-mocha-blue hover:bg-mocha-surface1 transition-colors"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(vocab.id)}
                            className="p-1 rounded text-mocha-subtext0 hover:text-mocha-red hover:bg-mocha-surface1 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
