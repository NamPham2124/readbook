import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for phonetic lookups
const ipaCache = new Map<string, string | null>();
const MAX_CACHE_SIZE = 2000;

/**
 * Fetch IPA for a single English word from Free Dictionary API
 */
async function fetchSingleWordIpa(rawWord: string): Promise<string | null> {
  const cleanWord = rawWord.toLowerCase().replace(/[^a-z'-]/g, '').trim();
  if (!cleanWord) return null;

  if (ipaCache.has(cleanWord)) {
    return ipaCache.get(cleanWord)!;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!res.ok) {
      ipaCache.set(cleanWord, null);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      ipaCache.set(cleanWord, null);
      return null;
    }

    let foundIpa: string | null = null;

    for (const entry of data) {
      if (entry.phonetic && typeof entry.phonetic === 'string') {
        foundIpa = entry.phonetic.trim();
        break;
      }
      if (Array.isArray(entry.phonetics)) {
        for (const p of entry.phonetics) {
          if (p.text && typeof p.text === 'string' && p.text.trim().length > 0) {
            foundIpa = p.text.trim();
            break;
          }
        }
      }
      if (foundIpa) break;
    }

    // Format with standard slashes if not already present
    if (foundIpa) {
      if (!foundIpa.startsWith('/')) foundIpa = `/${foundIpa}`;
      if (!foundIpa.endsWith('/')) foundIpa = `${foundIpa}/`;
    }

    // Save in cache
    if (ipaCache.size >= MAX_CACHE_SIZE) {
      const firstKey = ipaCache.keys().next().value;
      if (firstKey) ipaCache.delete(firstKey);
    }
    ipaCache.set(cleanWord, foundIpa);

    return foundIpa;
  } catch {
    return null;
  }
}

/**
 * Resolve IPA for a single word or full phrase
 */
async function resolvePhraseIpa(text: string): Promise<string | null> {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;

  const words = normalized.split(' ').filter((w) => w.length > 0);

  // 1. Single word lookup
  if (words.length === 1) {
    return await fetchSingleWordIpa(words[0]);
  }

  // 2. Phrase lookup: first try full phrase (some idioms exist in dictionary)
  const fullPhraseIpa = await fetchSingleWordIpa(normalized);
  if (fullPhraseIpa) return fullPhraseIpa;

  // 3. Fallback for phrase: lookup each word in parallel
  const wordIpaResults = await Promise.allSettled(words.map((w) => fetchSingleWordIpa(w)));

  const ipaTokens: string[] = [];
  let hasAnyIpa = false;

  for (let i = 0; i < words.length; i++) {
    const res = wordIpaResults[i];
    if (res.status === 'fulfilled' && res.value) {
      ipaTokens.push(res.value);
      hasAnyIpa = true;
    } else {
      ipaTokens.push(words[i]); // Keep original word if no IPA found for that segment
    }
  }

  if (!hasAnyIpa) {
    return null; // Return null so UI displays "IPA unavailable" without faking
  }

  return ipaTokens.join(' ');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word || word.trim() === '') {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
  }

  const ipa = await resolvePhraseIpa(word);
  return NextResponse.json({
    word: word.trim(),
    ipa: ipa,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word } = body;

    if (!word || typeof word !== 'string' || word.trim() === '') {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    const ipa = await resolvePhraseIpa(word);
    return NextResponse.json({
      word: word.trim(),
      ipa: ipa,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Dictionary lookup failed' }, { status: 500 });
  }
}
