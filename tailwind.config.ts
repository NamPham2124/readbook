import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="oled"]'],
  theme: {
    extend: {
      colors: {
        mocha: {
          base: 'var(--bg-mocha-base, #1e1e2e)',
          mantle: 'var(--bg-mocha-mantle, #181825)',
          crust: 'var(--bg-mocha-crust, #11111b)',
          surface0: 'var(--bg-mocha-surface0, #313244)',
          surface1: 'var(--bg-mocha-surface1, #45475a)',
          surface2: 'var(--bg-mocha-surface2, #585b70)',
          overlay0: 'var(--bg-mocha-overlay0, #6c7086)',
          overlay1: 'var(--bg-mocha-overlay1, #7f849c)',
          overlay2: 'var(--bg-mocha-overlay2, #9399b2)',
          subtext0: 'var(--text-mocha-subtext0, #a6adc8)',
          subtext1: 'var(--text-mocha-subtext1, #bac2de)',
          text: 'var(--text-mocha-text, #cdd6f4)',
          lavender: 'var(--accent-lavender, #b4befe)',
          blue: 'var(--accent-blue, #89b4fa)',
          sapphire: '#74c7ec',
          sky: '#89dceb',
          teal: 'var(--accent-teal, #94e2d5)',
          green: 'var(--accent-green, #a6e3a1)',
          yellow: 'var(--accent-yellow, #f9e2af)',
          peach: '#fab387',
          maroon: '#eba0ac',
          red: 'var(--accent-red, #f38ba8)',
          mauve: 'var(--accent-mauve, #cba6f7)',
          pink: '#f5c2e7',
          flamingo: '#f2cdcd',
          rosewater: '#f5e0dc',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(137, 180, 250, 0.3)',
        'glow-purple': '0 0 20px -5px rgba(203, 166, 247, 0.3)',
      },
    },
  },
  plugins: [],
};
export default config;
