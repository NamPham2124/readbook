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
    const pageNumber = searchParams.get('page_number');

    if (!bookId) {
      return NextResponse.json({ error: 'book_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('highlights')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId);

    if (pageNumber) {
      query = query.eq('page_number', parseInt(pageNumber, 10));
    }

    const { data: highlights, error: dbError } = await query.order('page_number', { ascending: true });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ highlights: highlights || [] });
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
    const { book_id, page_number, selected_text, rectangles, color, note } = body;

    if (!book_id || typeof page_number !== 'number' || !selected_text) {
      return NextResponse.json(
        { error: 'book_id, page_number, and selected_text are required' },
        { status: 400 }
      );
    }

    const { data: highlight, error: dbError } = await supabase
      .from('highlights')
      .insert({
        user_id: user.id,
        book_id,
        page_number,
        selected_text,
        rectangles: rectangles || [],
        color: color || '#f9e2af',
        note: note || null,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ highlight }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const highlightId = searchParams.get('id');

    if (!highlightId) {
      return NextResponse.json({ error: 'Highlight ID is required' }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('highlights')
      .delete()
      .eq('id', highlightId)
      .eq('user_id', user.id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
