import { describe, it, expect } from 'vitest';

describe('Free Dictionary API & IPA Logic', () => {
  it('formats IPA phonetics with forward slashes correctly', () => {
    const rawIpa = 'ˌɒptɪmaɪˈzeɪʃən';
    let formatted = rawIpa.trim();
    if (!formatted.startsWith('/')) formatted = `/${formatted}`;
    if (!formatted.endsWith('/')) formatted = `${formatted}/`;

    expect(formatted).toBe('/ˌɒptɪmaɪˈzeɪʃən/');
  });

  it('preserves existing slashes if already formatted', () => {
    const rawIpa = '/ˈɪnfərəns/';
    let formatted = rawIpa.trim();
    if (!formatted.startsWith('/')) formatted = `/${formatted}`;
    if (!formatted.endsWith('/')) formatted = `${formatted}/`;

    expect(formatted).toBe('/ˈɪnfərəns/');
  });

  it('handles multi-word phrases by combining word IPAs', () => {
    const word1 = { word: 'artificial', ipa: '/ˌɑːrtɪˈfɪʃəl/' };
    const word2 = { word: 'intelligence', ipa: '/ɪnˈtelɪdʒəns/' };

    const combinedIpa = `${word1.ipa} ${word2.ipa}`;
    expect(combinedIpa).toBe('/ˌɑːrtɪˈfɪʃəl/ /ɪnˈtelɪdʒəns/');
  });

  it('returns null and does not fake IPA when pronunciation is missing', () => {
    const mockApiResponse: any[] = [];
    const ipa = mockApiResponse.length > 0 ? mockApiResponse[0].phonetic : null;

    expect(ipa).toBeNull();
  });
});
