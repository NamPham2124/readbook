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

    if (bookId) {
      // Get tags assigned to this specific book
      const { data: bookTags, error: dbError } = await supabase
        .from('book_tags')
        .select(`
          book_id,
          tag_id,
          page_number,
          tags (
            id,
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .eq('book_id', bookId);

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }

      return NextResponse.json({ book_tags: bookTags || [] });
    }

    // Get all custom tags created by user
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (tagsError) {
      return NextResponse.json({ error: tagsError.message }, { status: 500 });
    }

    return NextResponse.json({ tags: tags || [] });
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
    const { action } = body;

    if (action === 'create_tag') {
      const { name, color } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
      }

      const { data: tag, error: dbError } = await supabase
        .from('tags')
        .upsert(
          {
            user_id: user.id,
            name: name.trim(),
            color: color || '#89b4fa',
          },
          { onConflict: 'user_id,name' }
        )
        .select()
        .single();

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }

      return NextResponse.json({ tag });
    }

    if (action === 'assign_tag') {
      const { book_id, tag_id, page_number } = body;
      if (!book_id || !tag_id) {
        return NextResponse.json({ error: 'book_id and tag_id are required' }, { status: 400 });
      }

      const { data: bookTag, error: dbError } = await supabase
        .from('book_tags')
        .insert({
          book_id,
          tag_id,
          user_id: user.id,
          page_number: page_number || 1,
        })
        .select()
        .single();

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }

      return NextResponse.json({ book_tag: bookTag });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
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
    const bookId = searchParams.get('book_id');
    const tagId = searchParams.get('tag_id');
    const pageNumber = searchParams.get('page_number');

    if (bookId && tagId) {
      // Remove specific tag from book
      let query = supabase
        .from('book_tags')
        .delete()
        .eq('book_id', bookId)
        .eq('tag_id', tagId)
        .eq('user_id', user.id);

      if (pageNumber) {
        query = query.eq('page_number', parseInt(pageNumber, 10));
      }

      const { error: dbError } = await query;
      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (tagId) {
      // Delete user tag entirely
      const { error: dbError } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)
        .eq('user_id', user.id);

      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
