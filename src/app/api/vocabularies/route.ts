import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('book_id');
    const pageParam = searchParams.get('page');

    if (!bookId) {
      return NextResponse.json({ error: 'book_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('vocabularies')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .order('created_at', { ascending: true });

    if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      if (!isNaN(pageNum) && pageNum >= 1) {
        query = query.eq('page_number', pageNum);
      }
    }

    const { data: vocabularies, error: dbError } = await query;

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ vocabularies: vocabularies || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { book_id, page_number, word, ipa, translation } = body;

    // Strict Server-side Validation
    if (!book_id || typeof book_id !== 'string') {
      return NextResponse.json({ error: 'Valid book_id is required' }, { status: 400 });
    }

    if (!page_number || typeof page_number !== 'number' || page_number < 1) {
      return NextResponse.json({ error: 'Valid page_number (>= 1) is required' }, { status: 400 });
    }

    if (!word || typeof word !== 'string' || word.trim() === '') {
      return NextResponse.json({ error: 'word is required' }, { status: 400 });
    }

    if (!translation || typeof translation !== 'string' || translation.trim() === '') {
      return NextResponse.json({ error: 'translation is required' }, { status: 400 });
    }

    const cleanIpa = typeof ipa === 'string' && ipa.trim() !== '' ? ipa.trim() : null;

    const { data: newVocab, error: insertError } = await supabase
      .from('vocabularies')
      .insert({
        user_id: user.id,
        book_id,
        page_number: Math.floor(page_number),
        word: word.trim(),
        ipa: cleanIpa,
        translation: translation.trim(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ vocabulary: newVocab }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
