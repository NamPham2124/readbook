import { describe, it, expect } from 'vitest';

describe('Reader & Annotations Logic', () => {
  it('calculates reading progress accurately', () => {
    const totalPages = 200;
    const page50 = 50;
    const progress50 = (page50 / totalPages) * 100;
    expect(progress50).toBe(25);

    const page200 = 200;
    const progress200 = (page200 / totalPages) * 100;
    expect(progress200).toBe(100);
  });

  it('clamps page numbers within [1, totalPages]', () => {
    const totalPages = 50;
    const clamp = (p: number) => Math.max(1, Math.min(p, totalPages));

    expect(clamp(-5)).toBe(1);
    expect(clamp(0)).toBe(1);
    expect(clamp(25)).toBe(25);
    expect(clamp(999)).toBe(50);
  });

  it('filters highlights and notes per page', () => {
    const annotations = [
      { id: '1', page_number: 1, text: 'Intro' },
      { id: '2', page_number: 2, text: 'Chapter 1' },
      { id: '3', page_number: 2, text: 'Definition' },
    ];

    const page2Annotations = annotations.filter((a) => a.page_number === 2);
    expect(page2Annotations.length).toBe(2);
  });
});
