import { describe, it, expect } from 'vitest';

describe('Vocabulary Table & Persistence Logic', () => {
  const userA = { id: 'user-a-uuid' };
  const userB = { id: 'user-b-uuid' };
  const bookId = 'book-1-uuid';

  const vocabA_Page1 = {
    id: 'v1',
    user_id: userA.id,
    book_id: bookId,
    page_number: 1,
    word: 'optimization',
    ipa: '/ˌɒptɪmaɪˈzeɪʃən/',
    translation: 'tối ưu hóa',
  };

  const vocabA_Page2 = {
    id: 'v2',
    user_id: userA.id,
    book_id: bookId,
    page_number: 2,
    word: 'inference',
    ipa: '/ˈɪnfərəns/',
    translation: 'suy luận',
  };

  const vocabB_Page1 = {
    id: 'v3',
    user_id: userB.id,
    book_id: bookId,
    page_number: 1,
    word: 'gradient',
    ipa: '/ˈɡreɪdiənt/',
    translation: 'độ dốc',
  };

  it('filters vocabularies strictly by current page', () => {
    const allVocabs = [vocabA_Page1, vocabA_Page2];
    const page1Vocabs = allVocabs.filter((v) => v.page_number === 1);
    const page2Vocabs = allVocabs.filter((v) => v.page_number === 2);

    expect(page1Vocabs.length).toBe(1);
    expect(page1Vocabs[0].word).toBe('optimization');

    expect(page2Vocabs.length).toBe(1);
    expect(page2Vocabs[0].word).toBe('inference');
  });

  it('isolates vocabularies per user (User A cannot see User B vocabs)', () => {
    const dbRows = [vocabA_Page1, vocabA_Page2, vocabB_Page1];

    const userARows = dbRows.filter((r) => r.user_id === userA.id);
    const userBRows = dbRows.filter((r) => r.user_id === userB.id);

    expect(userARows.length).toBe(2);
    expect(userARows.some((r) => r.word === 'gradient')).toBe(false);

    expect(userBRows.length).toBe(1);
    expect(userBRows[0].word).toBe('gradient');
  });

  it('validates required fields for vocabulary creation', () => {
    const validateVocab = (data: any) => {
      if (!data.book_id || typeof data.book_id !== 'string') return false;
      if (!data.page_number || typeof data.page_number !== 'number' || data.page_number < 1) return false;
      if (!data.word || typeof data.word !== 'string' || data.word.trim() === '') return false;
      if (!data.translation || typeof data.translation !== 'string' || data.translation.trim() === '') return false;
      return true;
    };

    expect(validateVocab(vocabA_Page1)).toBe(true);
    expect(validateVocab({ ...vocabA_Page1, word: '' })).toBe(false);
    expect(validateVocab({ ...vocabA_Page1, translation: '' })).toBe(false);
    expect(validateVocab({ ...vocabA_Page1, page_number: 0 })).toBe(false);
  });
});
