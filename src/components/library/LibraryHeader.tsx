'use client';

import React from 'react';
import { Search, LayoutGrid, List, Plus, Filter, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DEFAULT_CATEGORIES } from '@/lib/constants';

interface LibraryHeaderProps {
  search: string;
  onSearchChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  availableCategories: string[];
  sort: string;
  onSortChange: (val: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onOpenUpload: () => void;
}

export function LibraryHeader({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  availableCategories,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  onOpenUpload,
}: LibraryHeaderProps) {
  const allCategories = ['All', ...Array.from(new Set([...DEFAULT_CATEGORIES, ...availableCategories]))];

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mocha-overlay0 pointer-events-none" />
          <input
            type="text"
            placeholder="Search books by title, author, category..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-mocha-mantle/80 border border-mocha-surface0 text-mocha-text placeholder:text-mocha-overlay0 text-sm rounded-xl focus:outline-none focus:border-mocha-blue focus:ring-1 focus:ring-mocha-blue transition-all"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-mocha-mantle/80 border border-mocha-surface0 rounded-xl px-2.5 py-1.5 text-xs text-mocha-subtext0">
            <Filter className="w-3.5 h-3.5 text-mocha-blue shrink-0" />
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="bg-transparent text-mocha-text focus:outline-none text-xs font-medium cursor-pointer"
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-mocha-mantle text-mocha-text">
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-mocha-mantle/80 border border-mocha-surface0 rounded-xl px-2.5 py-1.5 text-xs text-mocha-subtext0">
            <ArrowUpDown className="w-3.5 h-3.5 text-mocha-mauve shrink-0" />
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-mocha-text focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="recent" className="bg-mocha-mantle text-mocha-text">Recently Added</option>
              <option value="title" className="bg-mocha-mantle text-mocha-text">Title (A-Z)</option>
              <option value="progress" className="bg-mocha-mantle text-mocha-text">Reading Progress</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-mocha-mantle/80 border border-mocha-surface0 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-mocha-surface0 text-mocha-blue'
                  : 'text-mocha-overlay0 hover:text-mocha-text'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-mocha-surface0 text-mocha-blue'
                  : 'text-mocha-overlay0 hover:text-mocha-text'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Upload Button */}
          <Button variant="primary" size="sm" onClick={onOpenUpload} className="gap-1.5">
            <Plus className="w-4 h-4" /> Upload Book
          </Button>
        </div>
      </div>
    </div>
  );
}
