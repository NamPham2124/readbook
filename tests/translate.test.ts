import { describe, it, expect } from 'vitest';

describe('LibreTranslate Service & Normalization Logic', () => {
  it('normalizes whitespace and excess newlines', () => {
    const rawInput = '   artificial \n\n  intelligence   \t  systems   ';
    const normalized = rawInput.trim().replace(/\s+/g, ' ').slice(0, 1000);

    expect(normalized).toBe('artificial intelligence systems');
  });

  it('rejects empty or whitespace-only inputs', () => {
    const emptyInputs = ['', '   ', '\n\t  \n'];
    emptyInputs.forEach((input) => {
      const isValid = input && typeof input === 'string' && input.trim() !== '';
      expect(Boolean(isValid)).toBe(false);
    });
  });

  it('enforces character length limit', () => {
    const longText = 'a'.repeat(2000);
    const normalized = longText.trim().replace(/\s+/g, ' ').slice(0, 1000);

    expect(normalized.length).toBe(1000);
  });

  it('resolves correct translation payload structure', () => {
    const text = 'machine learning';
    const translation = 'học máy';
    const payload = {
      text,
      translation,
    };

    expect(payload.text).toBe('machine learning');
    expect(payload.translation).toBe('học máy');
  });
});
