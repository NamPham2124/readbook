'use client';

import React from 'react';
import { APP_NAME } from '@/lib/constants';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  glow?: boolean;
}

export function Logo({
  size = 'md',
  showText = true,
  className = '',
  glow = true,
}: LogoProps) {
  const iconDimensions = {
    sm: { w: 26, h: 26, text: 'text-sm' },
    md: { w: 36, h: 36, text: 'text-lg' },
    lg: { w: 48, h: 48, text: 'text-2xl' },
    xl: { w: 64, h: 64, text: 'text-4xl' },
  }[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Modern Gradient Book Icon with Geometric Glow */}
      <div
        className="relative flex items-center justify-center shrink-0 group"
        style={{ width: iconDimensions.w, height: iconDimensions.h }}
      >
        {glow && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-mocha-blue/40 via-mocha-mauve/30 to-mocha-teal/40 blur-md opacity-75 group-hover:opacity-100 transition-opacity" />
        )}
        
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 w-full h-full drop-shadow-md transition-transform group-hover:scale-105"
        >
          {/* Rounded Background Badge */}
          <rect
            width="48"
            height="48"
            rx="14"
            fill="url(#logo_bg_gradient)"
            className="transition-all"
          />

          {/* Book Spine / Shadow Accent */}
          <path
            d="M24 13V36"
            stroke="url(#spine_gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Left Book Page */}
          <path
            d="M24 15C20.5 13 14 13 11 14.5C10 15 10 16.5 10 33C14 31.5 20.5 32 24 34.5"
            fill="url(#left_page_gradient)"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Right Book Page */}
          <path
            d="M24 15C27.5 13 34 13 37 14.5C38 15 38 16.5 38 33C34 31.5 27.5 32 24 34.5"
            fill="url(#right_page_gradient)"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Glowing Bookmark Ribbon */}
          <path
            d="M24 11V21L26.5 19L29 21V12.5"
            fill="url(#ribbon_gradient)"
            stroke="#f9e2af"
            strokeWidth="1"
            strokeLinejoin="round"
          />

          {/* Sparkle / Knowledge Star */}
          <circle cx="34" cy="12" r="2" fill="#94e2d5" className="animate-pulse" />

          {/* SVG Gradients */}
          <defs>
            <linearGradient id="logo_bg_gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1e1e2e" />
              <stop offset="0.5" stopColor="#313244" />
              <stop offset="1" stopColor="#181825" />
            </linearGradient>

            <linearGradient id="left_page_gradient" x1="10" y1="13" x2="24" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#89b4fa" stopOpacity="0.9" />
              <stop offset="1" stopColor="#b4befe" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="right_page_gradient" x1="38" y1="13" x2="24" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#cba6f7" stopOpacity="0.9" />
              <stop offset="1" stopColor="#f5c2e7" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="spine_gradient" x1="24" y1="13" x2="24" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#94e2d5" />
              <stop offset="1" stopColor="#89b4fa" />
            </linearGradient>

            <linearGradient id="ribbon_gradient" x1="24" y1="11" x2="29" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f9e2af" />
              <stop offset="1" stopColor="#fab387" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-black tracking-tight leading-none bg-gradient-to-r from-mocha-blue via-mocha-mauve to-mocha-teal bg-clip-text text-transparent ${iconDimensions.text}`}
          >
            {APP_NAME}
          </span>
          {size === 'lg' || size === 'xl' ? (
            <span className="text-[11px] font-semibold text-mocha-subtext0 tracking-wider uppercase mt-1">
              Smart Digital Reader
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
