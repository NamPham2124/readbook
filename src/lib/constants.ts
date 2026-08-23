export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'ReadBook';

export const MAX_BOOK_SIZE_MB = parseInt(process.env.MAX_BOOK_SIZE_MB || '200', 10);
export const MAX_BOOK_SIZE_BYTES = MAX_BOOK_SIZE_MB * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.fb2', '.cbz'] as const;
export type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

export const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#f9e2af', border: '#fab387' },
  { label: 'Green', value: '#a6e3a1', border: '#94e2d5' },
  { label: 'Pink', value: '#f38ba8', border: '#eba0ac' },
  { label: 'Blue', value: '#89b4fa', border: '#74c7ec' },
  { label: 'Purple', value: '#cba6f7', border: '#b4befe' },
] as const;

export const DEFAULT_CATEGORIES = [
  'General',
  'Robotics',
  'Computer Vision',
  'AI',
  'Deep Learning',
  'Programming',
  'Mathematics',
  'Science',
] as const;

export const THEME_COLORS = {
  base: '#1e1e2e',
  mantle: '#181825',
  crust: '#11111b',
  surface0: '#313244',
  surface1: '#45475a',
  surface2: '#585b70',
  text: '#cdd6f4',
  subtext0: '#a6adc8',
  subtext1: '#bac2de',
  lavender: '#b4befe',
  blue: '#89b4fa',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  red: '#f38ba8',
  mauve: '#cba6f7',
} as const;
