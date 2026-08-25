import { NextRequest, NextResponse } from 'next/server';

// In-memory LRU cache for translations
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

// List of public LibreTranslate mirror endpoints to try in order
const DEFAULT_MIRRORS = [
  'https://translate.disroot.org',
  'https://translate.argosopentech.com',
  'https://translate.terraprint.co',
  'https://libretranslate.de',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, sourceLanguage = 'en', targetLanguage = 'vi' } = body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json({ error: 'Text to translate is required' }, { status: 400 });
    }

    // Normalize text
    const normalizedText = text.trim().replace(/\s+/g, ' ').slice(0, 1000);
    const cacheKey = `${sourceLanguage}:${targetLanguage}:${normalizedText.toLowerCase()}`;

    if (translationCache.has(cacheKey)) {
      return NextResponse.json({
        text: normalizedText,
        translation: translationCache.get(cacheKey)!,
        cached: true,
      });
    }

    // Determine endpoints to try
    const customUrl = process.env.LIBRETRANSLATE_URL?.trim();
    const apiKey = process.env.LIBRETRANSLATE_API_KEY?.trim();
    const endpointsToTry = customUrl ? [customUrl, ...DEFAULT_MIRRORS] : DEFAULT_MIRRORS;

    let translatedText: string | null = null;
    let lastError = 'Unable to connect to LibreTranslate service';

    // 1. Try LibreTranslate instances
    for (const baseUrl of endpointsToTry) {
      try {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const translateUrl = cleanBaseUrl.endsWith('/translate')
          ? cleanBaseUrl
          : `${cleanBaseUrl}/translate`;

        const payload: Record<string, any> = {
          q: normalizedText,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text',
        };

        if (apiKey) {
          payload.api_key = apiKey;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(translateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          if (data.translatedText) {
            translatedText = data.translatedText;
            break;
          }
        } else {
          const errData = await response.text();
          lastError = `LibreTranslate error (${response.status}): ${errData}`;
        }
      } catch (err: any) {
        lastError = err.message || 'LibreTranslate mirror timeout';
      }
    }

    // 2. Open Source Fallback if all mirrors are busy
    if (!translatedText) {
      try {
        const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          normalizedText
        )}&langpair=${sourceLanguage}|${targetLanguage}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (fallbackRes.ok) {
          const fbData = await fallbackRes.json();
          if (fbData?.responseData?.translatedText) {
            translatedText = fbData.responseData.translatedText;
          }
        }
      } catch {}
    }

    if (!translatedText) {
      return NextResponse.json(
        { error: 'Translation service currently unavailable. Please try again.', details: lastError },
        { status: 503 }
      );
    }

    // Cache the result
    if (translationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translatedText);

    return NextResponse.json({
      text: normalizedText,
      translation: translatedText,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal translation error' },
      { status: 500 }
    );
  }
}
