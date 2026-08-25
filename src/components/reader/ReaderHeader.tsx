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
  Search,
  BookOpen,
  Languages,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
}: ReaderHeaderProps) {
  return (
    <header className="h-14 bg-mocha-mantle border-b border-mocha-surface0 px-3 flex items-center justify-between gap-2 z-30 select-none">
      {/* Left: Back to library & TOC toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href="/library"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 text-xs font-semibold transition-colors"
          title="Về Thư Viện"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Thư viện</span>
        </Link>

        <div className="h-4 w-px bg-mocha-surface0 mx-1" />

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

        {/* Title */}
        <h2 className="hidden md:block text-xs font-bold text-mocha-text truncate max-w-[180px] lg:max-w-[280px] ml-2">
          {title}
        </h2>
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

      {/* Right: Translate Toggle, Zoom, Rotate, Fullscreen, Sidebar */}
      <div className="flex items-center gap-1.5 shrink-0">
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

        {onFitWidth && (
          <button
            onClick={onFitWidth}
            className="hidden lg:inline-flex px-2 py-1 text-[11px] font-semibold text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 rounded-lg transition-colors"
            title="Vừa Chiều Ngang"
          >
            Fit Width
          </button>
        )}

        {onRotate && (
          <button
            onClick={onRotate}
            className="p-1.5 rounded-lg text-mocha-subtext0 hover:text-mocha-text hover:bg-mocha-surface0 transition-colors"
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
