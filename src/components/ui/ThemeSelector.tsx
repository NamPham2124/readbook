'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check, Sun, Moon, Sparkles, BookOpen, Smartphone } from 'lucide-react';

export type ReadingTheme = 'mocha' | 'latte' | 'sepia' | 'nord' | 'oled';

export interface ThemeOption {
  id: ReadingTheme;
  name: string;
  desc: string;
  bgHex: string;
  textHex: string;
  accentHex: string;
  icon: any;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'mocha',
    name: 'Mocha',
    desc: 'Catppuccin Dark (Mặc định)',
    bgHex: '#1e1e2e',
    textHex: '#cdd6f4',
    accentHex: '#89b4fa',
    icon: Moon,
  },
  {
    id: 'latte',
    name: 'Latte',
    desc: 'Sáng Thanh Lịch (Light)',
    bgHex: '#eff1f5',
    textHex: '#4c4f69',
    accentHex: '#1e66f5',
    icon: Sun,
  },
  {
    id: 'sepia',
    name: 'Sepia',
    desc: 'Giấy Cổ Điển (Đỡ mỏi mắt)',
    bgHex: '#f7eed7',
    textHex: '#3e2d1a',
    accentHex: '#a36224',
    icon: BookOpen,
  },
  {
    id: 'nord',
    name: 'Nord',
    desc: 'Đêm Đại Dương (Midnight)',
    bgHex: '#0f172a',
    textHex: '#f8fafc',
    accentHex: '#38bdf8',
    icon: Sparkles,
  },
  {
    id: 'oled',
    name: 'OLED Black',
    desc: 'Đen Tuyệt Đối (Tiết kiệm pin)',
    bgHex: '#000000',
    textHex: '#ffffff',
    accentHex: '#60a5fa',
    icon: Smartphone,
  },
];

interface ThemeSelectorProps {
  compact?: boolean;
  align?: 'left' | 'right';
}

export function ThemeSelector({ compact = false, align = 'right' }: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState<ReadingTheme>('mocha');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize theme on mount from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('readbook_theme') as ReadingTheme;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setCurrentTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'mocha');
    }
  }, []);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTheme = (theme: ReadingTheme) => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('readbook_theme', theme);
    setIsOpen(false);
  };

  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];
  const IconComponent = activeThemeObj.icon;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 rounded-xl border border-mocha-surface0 bg-mocha-surface0/60 hover:bg-mocha-surface1/60 hover:border-mocha-blue/40 text-mocha-text transition-all ${
          compact ? 'p-1.5' : 'px-3 py-1.5 text-xs font-semibold'
        }`}
        title={`Đổi giao diện: Đang dùng ${activeThemeObj.name}`}
      >
        <span
          className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-inner flex items-center justify-center"
          style={{ backgroundColor: activeThemeObj.accentHex }}
        />
        {!compact && (
          <span className="hidden sm:inline font-bold text-xs">{activeThemeObj.name}</span>
        )}
        <Palette className="w-3.5 h-3.5 text-mocha-subtext0" />
      </button>

      {/* Theme Options Dropdown */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-64 rounded-2xl bg-mocha-mantle/95 backdrop-blur-xl border border-mocha-surface1 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="px-2.5 py-1.5 border-b border-mocha-surface0 text-[11px] font-bold text-mocha-subtext0 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-mocha-blue" />
              <span>Chế Độ Màu / Giao Diện</span>
            </span>
          </div>

          <div className="space-y-1 pt-1.5">
            {THEMES.map((theme) => {
              const isSelected = currentTheme === theme.id;
              const ThemeIcon = theme.icon;

              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-mocha-surface1 text-mocha-text font-bold ring-1 ring-mocha-blue/30'
                      : 'hover:bg-mocha-surface0/60 text-mocha-subtext0 hover:text-mocha-text'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Visual Color Preview Orb */}
                    <div
                      className="w-6 h-6 rounded-lg border border-black/20 flex items-center justify-center shrink-0 shadow-sm"
                      style={{ backgroundColor: theme.bgHex }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: theme.accentHex }}
                      />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs font-bold leading-tight">{theme.name}</span>
                      <span className="text-[10px] text-mocha-overlay1 leading-tight mt-0.5">
                        {theme.desc}
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-mocha-blue shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
