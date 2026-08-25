'use client';

import React, { useState } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  X,
  BookOpen,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { Book, Note, Highlight, Vocabulary } from '@/lib/types/database';
import { toast } from 'sonner';

interface ExportNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  notes: Note[];
  vocabularies: Vocabulary[];
  highlights: Highlight[];
}

export function ExportNotesModal({
  isOpen,
  onClose,
  book,
  notes,
  vocabularies,
  highlights,
}: ExportNotesModalProps) {
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeVocab, setIncludeVocab] = useState(true);
  const [includeHighlights, setIncludeHighlights] = useState(true);
  const [copied, setCopied] = useState(false);

  const bookTitle = book?.title || 'Sách';
  const cleanFileName = bookTitle
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '_')
    .slice(0, 40);

  // 1. Generate Markdown Content
  const generateMarkdown = () => {
    let md = `# 📖 Ghi Chú & Từ Vựng: ${bookTitle}\n`;
    if (book?.author) md += `**Tác giả:** ${book.author}\n`;
    md += `**Thời gian xuất:** ${new Date().toLocaleString('vi-VN')}\n`;
    md += `\n---\n\n`;

    // Vocabularies Section
    if (includeVocab && vocabularies.length > 0) {
      md += `## 🌐 Bảng Từ Vựng & Phiên Âm (${vocabularies.length} từ)\n\n`;
      md += `| Từ (Word) | Phiên Âm (IPA) | Bản Dịch (Nghĩa) | Trang |\n`;
      md += `| :--- | :--- | :--- | :---: |\n`;
      vocabularies.forEach((v) => {
        md += `| **${v.word}** | \`${v.ipa || 'N/A'}\` | ${v.translation} | Trang ${v.page_number} |\n`;
      });
      md += `\n---\n\n`;
    }

    // Page Notes Section
    if (includeNotes && notes.length > 0) {
      md += `## 📝 Ghi Chú Theo Trang (${notes.length} ghi chú)\n\n`;
      notes
        .sort((a, b) => a.page_number - b.page_number)
        .forEach((n) => {
          md += `### 📄 Trang ${n.page_number}\n\n`;
          md += `${n.content}\n\n`;
        });
      md += `---\n\n`;
    }

    // Highlights Section
    if (includeHighlights && highlights.length > 0) {
      md += `## 🖍️ Các Đoạn Đánh Dấu (${highlights.length} đoạn)\n\n`;
      highlights
        .sort((a, b) => a.page_number - b.page_number)
        .forEach((h, i) => {
          md += `${i + 1}. **[Trang ${h.page_number}]**: _"${h.selected_text}"_\n`;
        });
      md += `\n`;
    }

    return md;
  };

  // 2. Generate CSV for Anki Flashcards
  const generateCsv = () => {
    const rows: string[] = [];
    // CSV Header
    rows.push(['"Từ (Word)"', '"Phiên Âm (IPA)"', '"Bản Dịch (Nghĩa)"', '"Trang"', '"Tên Sách"'].join(','));

    vocabularies.forEach((v) => {
      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      rows.push([
        escape(v.word),
        escape(v.ipa || ''),
        escape(v.translation),
        v.page_number,
        escape(bookTitle),
      ].join(','));
    });

    // Add UTF-8 BOM (\uFEFF) so Excel & Anki decode Vietnamese and IPA perfectly
    return '\uFEFF' + rows.join('\n');
  };

  // 3. Generate Printable HTML
  const generateHtml = () => {
    const md = generateMarkdown();
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Ghi Chú - ${bookTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #1e1e2e;
      background: #ffffff;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 { color: #1e66f5; border-bottom: 2px solid #e6e9ef; padding-bottom: 8px; }
    h2 { color: #8839ef; margin-top: 28px; }
    h3 { color: #179299; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ccd0da; padding: 8px 12px; text-align: left; }
    th { background-color: #f2f4f8; font-weight: bold; }
    code { font-family: monospace; background: #e6e9ef; padding: 2px 6px; border-radius: 4px; color: #d20f39; }
    blockquote { border-left: 4px solid #1e66f5; margin: 0; padding-left: 16px; color: #5c5f77; font-style: italic; }
    @media print {
      body { max-width: 100%; padding: 0; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div style="text-align: right; margin-bottom: 16px;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #1e66f5; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🖨️ In ra giấy / Lưu PDF</button>
  </div>
  <pre style="white-space: pre-wrap; font-family: inherit;">${md.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
  };

  // Downloader Helper
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã tải xuống file ${filename}`);
  };

  // Actions
  const handleExportMarkdown = () => {
    const content = generateMarkdown();
    downloadFile(content, `${cleanFileName}_notes.md`, 'text/markdown;charset=utf-8');
  };

  const handleExportCsv = () => {
    if (vocabularies.length === 0) {
      toast.info('Chưa có từ vựng nào để xuất file Anki/CSV.');
      return;
    }
    const content = generateCsv();
    downloadFile(content, `${cleanFileName}_anki_vocab.csv`, 'text/csv;charset=utf-8');
  };

  const handlePrintHtml = () => {
    const html = generateHtml();
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => {
        printWin.print();
      }, 500);
    }
  };

  const handleCopyMarkdown = () => {
    const content = generateMarkdown();
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Đã sao chép toàn bộ ghi chú vào Clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📥 Xuất File Ghi Chú & Bảng Từ Vựng"
      maxWidth="lg"
    >
      <div className="space-y-5 text-mocha-text">
        {/* Book summary card */}
        <div className="p-3 bg-mocha-surface0/60 rounded-xl border border-mocha-surface0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-mocha-blue/15 text-mocha-blue flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-mocha-text line-clamp-1">{bookTitle}</h4>
              <p className="text-[10px] text-mocha-subtext0">
                {vocabularies.length} từ vựng • {notes.length} ghi chú • {highlights.length} highlight
              </p>
            </div>
          </div>
        </div>

        {/* Content selection toggles */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-mocha-subtext0 uppercase tracking-wider">
            Chọn nội dung muốn xuất:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-mocha-base border border-mocha-surface0 cursor-pointer hover:border-mocha-blue/40 transition-colors">
              <input
                type="checkbox"
                checked={includeVocab}
                onChange={(e) => setIncludeVocab(e.target.checked)}
                className="rounded text-mocha-teal focus:ring-0"
              />
              <span className="text-xs font-semibold">Từ Vựng ({vocabularies.length})</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-mocha-base border border-mocha-surface0 cursor-pointer hover:border-mocha-blue/40 transition-colors">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
                className="rounded text-mocha-blue focus:ring-0"
              />
              <span className="text-xs font-semibold">Ghi Chú ({notes.length})</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-mocha-base border border-mocha-surface0 cursor-pointer hover:border-mocha-blue/40 transition-colors">
              <input
                type="checkbox"
                checked={includeHighlights}
                onChange={(e) => setIncludeHighlights(e.target.checked)}
                className="rounded text-mocha-yellow focus:ring-0"
              />
              <span className="text-xs font-semibold">Highlights ({highlights.length})</span>
            </label>
          </div>
        </div>

        {/* Export format buttons */}
        <div className="space-y-2.5 pt-1">
          <label className="text-[11px] font-bold text-mocha-subtext0 uppercase tracking-wider">
            Chọn định dạng xuất file:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Markdown .md */}
            <button
              onClick={handleExportMarkdown}
              className="flex items-start gap-3 p-3 rounded-xl bg-mocha-surface0/50 hover:bg-mocha-surface1/60 border border-mocha-surface0 hover:border-mocha-blue/50 text-left transition-all group shadow-sm"
            >
              <div className="p-2 rounded-lg bg-mocha-blue/15 text-mocha-blue group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-mocha-text flex items-center gap-1.5">
                  <span>Markdown (.md)</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-mocha-blue/20 text-mocha-blue rounded font-bold">
                    Phổ biến
                  </span>
                </div>
                <p className="text-[11px] text-mocha-subtext0 mt-0.5 leading-tight">
                  Tương thích Notion, Obsidian, GitHub.
                </p>
              </div>
            </button>

            {/* 2. Anki Flashcards .csv */}
            <button
              onClick={handleExportCsv}
              className="flex items-start gap-3 p-3 rounded-xl bg-mocha-surface0/50 hover:bg-mocha-surface1/60 border border-mocha-surface0 hover:border-mocha-teal/50 text-left transition-all group shadow-sm"
            >
              <div className="p-2 rounded-lg bg-mocha-teal/15 text-mocha-teal group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-mocha-text flex items-center gap-1.5">
                  <span>Anki / CSV (.csv)</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-mocha-teal/20 text-mocha-teal rounded font-bold">
                    Học từ vựng
                  </span>
                </div>
                <p className="text-[11px] text-mocha-subtext0 mt-0.5 leading-tight">
                  Nhập trực tiếp vào Anki / Quizlet / Excel.
                </p>
              </div>
            </button>

            {/* 3. In ấn / PDF HTML */}
            <button
              onClick={handlePrintHtml}
              className="flex items-start gap-3 p-3 rounded-xl bg-mocha-surface0/50 hover:bg-mocha-surface1/60 border border-mocha-surface0 hover:border-mocha-mauve/50 text-left transition-all group shadow-sm"
            >
              <div className="p-2 rounded-lg bg-mocha-mauve/15 text-mocha-mauve group-hover:scale-105 transition-transform">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-mocha-text flex items-center gap-1.5">
                  <span>In ấn / Xuất PDF</span>
                </div>
                <p className="text-[11px] text-mocha-subtext0 mt-0.5 leading-tight">
                  Xem bản in đẹp mắt và lưu dạng file PDF.
                </p>
              </div>
            </button>

            {/* 4. Copy to Clipboard */}
            <button
              onClick={handleCopyMarkdown}
              className="flex items-start gap-3 p-3 rounded-xl bg-mocha-surface0/50 hover:bg-mocha-surface1/60 border border-mocha-surface0 hover:border-mocha-yellow/50 text-left transition-all group shadow-sm"
            >
              <div className="p-2 rounded-lg bg-mocha-yellow/15 text-mocha-yellow group-hover:scale-105 transition-transform">
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-bold text-mocha-text flex items-center gap-1.5">
                  <span>{copied ? 'Đã sao chép!' : 'Copy Clipboard'}</span>
                </div>
                <p className="text-[11px] text-mocha-subtext0 mt-0.5 leading-tight">
                  Sao chép nhanh để dán vào ứng dụng khác.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-mocha-surface0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}
