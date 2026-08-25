'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  PanelLeft,
  PanelRight,
  RotateCw,
  Languages,
  Download,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { ThemeSelector } from '@/components/ui/ThemeSelector';

interface ReaderHeaderProps {
  title: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  onRotate?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  showLeftSidebar: boolean;
  onToggleLeftSidebar: () => void;
  showRightSidebar: boolean;
  onToggleRightSidebar: () => void;
  rightActiveTab: 'notes' | 'highlights' | 'tags';
  translateMode?: boolean;
  onToggleTranslateMode?: () => void;
  onOpenExportModal?: () => void;
}

export function ReaderHeader({
  title,
  currentPage,
  totalPages,
  onPageChange,
  scale,
  onScaleChange,
  onFitWidth,
  onFitPage,
  onRotate,
  isFullscreen,
  onToggleFullscreen,
  showLeftSidebar,
  onToggleLeftSidebar,
  showRightSidebar,
  onToggleRightSidebar,
  translateMode = false,
  onToggleTranslateMode,
  onOpenExportModal,
}: ReaderHeaderProps) {
  return (
    <header className="h-14 bg-mocha-mantle border-b border-mocha-surface0 px-3 flex items-center justify-between gap-2 z-30 select-none">
      {/* Left: Back to library, Logo & TOC toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href="/library"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 text-xs font-semibold transition-colors"
          title="Về Thư Viện"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Thư viện</span>
        </Link>

        <div className="h-4 w-px bg-mocha-surface0 mx-0.5" />

        <button
          onClick={onToggleLeftSidebar}
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            showLeftSidebar
              ? 'bg-mocha-surface0 text-mocha-blue'
              : 'text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0/60'
          }`}
          title="Mục Lục & Đánh Dấu"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Title & Small Logo */}
        <div className="hidden md:flex items-center gap-2 ml-2">
          <Logo size="sm" showText={false} />
          <h2 className="text-xs font-bold text-mocha-text truncate max-w-[160px] lg:max-w-[260px]">
            {title}
          </h2>
        </div>
      </div>

      {/* Center: Page navigation controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Trang Trước (Mũi tên Trái)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 text-xs text-mocha-subtext0 font-medium">
          <input
            type="number"
            min={1}
            max={totalPages || 1}
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                onPageChange(val);
              }
            }}
            className="w-12 text-center py-0.5 bg-mocha-surface0 border border-mocha-surface1 text-mocha-text rounded font-bold text-xs focus:outline-none focus:border-mocha-blue"
          />
          <span className="text-mocha-overlay1">/ {totalPages || 1}</span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Trang Tiếp (Mũi tên Phải)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Translate Toggle, Theme Switcher, Export, Zoom, Fullscreen, Sidebar */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* 🌐 Translate Mode Toggle Button */}
        {onToggleTranslateMode && (
          <button
            onClick={onToggleTranslateMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              translateMode
                ? 'bg-mocha-teal/20 text-mocha-teal border border-mocha-teal/50 shadow-sm ring-2 ring-mocha-teal/30 scale-105'
                : 'text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 border border-transparent'
            }`}
            title={
              translateMode
                ? 'Chế độ Dịch Thuật: ĐANG BẬT (Bôi đen từ để dịch)'
                : 'Bật Chế độ Dịch Thuật (🌐 Translate)'
            }
          >
            <Languages className="w-4 h-4 text-mocha-teal" />
            <span className="hidden sm:inline">Translate</span>
            {translateMode && (
              <span className="w-2 h-2 rounded-full bg-mocha-teal animate-pulse" />
            )}
          </button>
        )}

        {/* 🎨 Theme Selector in Reader Header */}
        <ThemeSelector compact={true} align="right" />

        {/* 📥 Export Notes & Vocabulary Button */}
        {onOpenExportModal && (
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold text-mocha-blue bg-mocha-blue/10 hover:bg-mocha-blue/20 border border-mocha-blue/30 transition-all shadow-sm"
            title="Xuất file Ghi Chú & Bảng Từ Vựng (Markdown, Anki CSV, PDF)"
          >
            <Download className="w-4 h-4 text-mocha-blue" />
            <span className="hidden lg:inline">Xuất File</span>
          </button>
        )}

        <div className="h-4 w-px bg-mocha-surface0 mx-0.5" />

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center gap-0.5 bg-mocha-surface0/60 border border-mocha-surface1/60 rounded-lg p-0.5">
          <button
            onClick={() => onScaleChange(Math.max(0.5, scale - 0.15))}
            className="p-1 rounded text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface1 transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-bold text-mocha-text px-1.5 min-w-[42px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => onScaleChange(Math.min(3.0, scale + 0.15))}
            className="p-1 rounded text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface1 transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {onRotate && (
          <button
            onClick={onRotate}
            className="hidden md:inline-flex p-1.5 rounded-lg text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 transition-colors"
            title="Xoay 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 transition-colors"
          title="Toàn Màn Hình (F)"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        <div className="h-4 w-px bg-mocha-surface0 mx-0.5" />

        {/* Right Sidebar toggle */}
        <button
          onClick={onToggleRightSidebar}
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            showRightSidebar
              ? 'bg-mocha-surface0 text-mocha-mauve'
              : 'text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0/60'
          }`}
          title="Bảng Ghi Chú & Highlight"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
