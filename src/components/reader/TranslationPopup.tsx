'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Loader2, Volume2, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface TranslationPopupProps {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  currentPage: number;
  onSave: (vocab: {
    word: string;
    ipa: string | null;
    translation: string;
    page_number: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export function TranslationPopup({
  visible,
  x,
  y,
  selectedText,
  currentPage,
  onSave,
  onCancel,
}: TranslationPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translation, setTranslation] = useState<string>('');
  const [ipa, setIpa] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTranslationAndIpa = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    setLoading(true);
    setError(null);
    setTranslation('');
    setIpa(null);

    try {
      // Parallel fetch for Translation & IPA
      const [translateRes, dictRes] = await Promise.allSettled([
        fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText, sourceLanguage: 'en', targetLanguage: 'vi' }),
        }).then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Translation failed');
          return data;
        }),
        fetch('/api/dictionary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: cleanText }),
        }).then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Dictionary lookup failed');
          return data;
        }),
      ]);

      let hasSuccess = false;

      if (translateRes.status === 'fulfilled' && translateRes.value?.translation) {
        setTranslation(translateRes.value.translation);
        hasSuccess = true;
      }

      if (dictRes.status === 'fulfilled') {
        setIpa(dictRes.value.ipa || null);
      } else {
        setIpa(null);
      }

      if (!hasSuccess) {
        const errMsg =
          translateRes.status === 'rejected'
            ? translateRes.reason?.message || 'Không thể dịch đoạn văn bản'
            : 'Không nhận được kết quả dịch';
        setError(errMsg);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối dịch thuật');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && selectedText) {
      fetchTranslationAndIpa(selectedText);
    }
  }, [visible, selectedText]);

  if (!visible) return null;

  const handleSave = async () => {
    if (!translation || translation.trim() === '') {
      toast.error('Bản dịch không được để trống');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        word: selectedText.trim(),
        ipa: ipa ? ipa.trim() : null,
        translation: translation.trim(),
        page_number: currentPage,
      });
      toast.success(`Đã lưu "${selectedText.trim()}" vào bảng từ vựng`);
    } catch (err: any) {
      toast.error(err.message || 'Lưu từ vựng thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  // Text-to-speech helper for English word
  const handlePronounce = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window && selectedText) {
      const utterance = new SpeechSynthesisUtterance(selectedText);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      ref={popupRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 bg-mocha-mantle/95 backdrop-blur-md border border-mocha-surface1 rounded-2xl shadow-2xl p-4 w-80 sm:w-96 text-mocha-text space-y-3 pointer-events-auto animate-in zoom-in-95 duration-150"
      style={{
        left: `${Math.max(16, Math.min(window.innerWidth - 390, x - 150))}px`,
        top: `${Math.max(16, Math.min(window.innerHeight - 260, y + 16))}px`,
      }}
    >
      {/* Header: Title and Language indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-mocha-surface0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-mocha-teal">
          <Globe className="w-3.5 h-3.5" />
          <span>Dịch Thuật & Phiên Âm</span>
        </div>
        <span className="text-[10px] font-semibold text-mocha-overlay1 px-1.5 py-0.5 bg-mocha-surface0 rounded">
          Trang {currentPage}
        </span>
      </div>

      {/* Selected Original Text & IPA */}
      <div className="space-y-1 bg-mocha-surface0/50 p-2.5 rounded-xl border border-mocha-surface0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-extrabold text-mocha-text leading-snug break-words">
            {selectedText}
          </p>
          <button
            onClick={handlePronounce}
            className="p-1 rounded-md text-mocha-subtext0 hover:text-mocha-blue hover:bg-mocha-surface1 transition-colors shrink-0"
            title="Phát âm"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* IPA Display */}
        <div className="flex items-center gap-2 pt-0.5">
          {loading ? (
            <span className="text-[11px] text-mocha-overlay1 italic flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Đang tìm IPA...
            </span>
          ) : ipa ? (
            <span className="text-xs font-mono font-semibold text-mocha-mauve bg-mocha-mauve/10 px-2 py-0.5 rounded-md border border-mocha-mauve/20">
              {ipa}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-mocha-overlay1 italic bg-mocha-surface1/40 px-1.5 py-0.5 rounded">
              IPA unavailable
            </span>
          )}
        </div>
      </div>

      {/* Translation Result / Loading / Error */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-mocha-subtext0">Bản dịch tiếng Việt:</label>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-4 bg-mocha-base/60 rounded-xl border border-mocha-surface0">
            <Loader2 className="w-4 h-4 animate-spin text-mocha-teal" />
            <span className="text-xs text-mocha-subtext0">Đang dịch qua LibreTranslate...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-mocha-red/10 border border-mocha-red/20 rounded-xl text-mocha-red text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Không thể dịch. Thử lại.</span>
            </div>
            <p className="text-[11px] text-mocha-subtext0 leading-tight">{error}</p>
            <button
              onClick={() => fetchTranslationAndIpa(selectedText)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-mocha-red/20 hover:bg-mocha-red/30 rounded text-[11px] font-bold text-mocha-text transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Thử lại
            </button>
          </div>
        ) : (
          <textarea
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            rows={2}
            className="w-full text-xs font-medium text-mocha-green bg-mocha-base border border-mocha-surface0 rounded-xl p-2.5 focus:outline-none focus:border-mocha-teal transition-colors resize-none"
            placeholder="Nhập hoặc chỉnh sửa bản dịch..."
          />
        )}
      </div>

      {/* Footer Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Hủy
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !!error || isSaving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-mocha-crust bg-mocha-teal hover:bg-mocha-teal/90 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md active:scale-95"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" /> Lưu vào từ vựng
            </>
          )}
        </button>
      </div>
    </div>
  );
}
