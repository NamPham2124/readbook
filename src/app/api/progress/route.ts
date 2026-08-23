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

    if (!bookId) {
      return NextResponse.json({ error: 'book_id is required' }, { status: 400 });
    }

    const { data: progress, error: dbError } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ progress: progress || null });
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
    const { book_id, page_number, progress } = body;

    if (!book_id || typeof page_number !== 'number') {
      return NextResponse.json({ error: 'book_id and page_number are required' }, { status: 400 });
    }

    const clampedProgress = Math.min(100, Math.max(0, typeof progress === 'number' ? progress : 0));

    const { data: updatedProgress, error: dbError } = await supabase
      .from('reading_progress')
      .upsert(
        {
          user_id: user.id,
          book_id,
          page_number,
          progress: clampedProgress,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,book_id' }
      )
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ progress: updatedProgress });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
