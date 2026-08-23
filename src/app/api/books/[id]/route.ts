import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: book, error: dbError } = await supabase
      .from('books')
      .select(`
        *,
        reading_progress (
          page_number,
          progress,
          updated_at
        )
      `)
      .eq('id', params.id)
      .single();

    if (dbError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const progress = Array.isArray(book.reading_progress)
      ? book.reading_progress[0] || null
      : book.reading_progress || null;

    return NextResponse.json({
      book: {
        ...book,
        progress,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    const prof = profile as any;
    const isAdmin = prof?.role === 'admin' && prof?.is_active;

    // Fetch the book to check ownership and storage path
    const { data: book, error: fetchError } = await supabase
      .from('books')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Permission check: Global books cannot be deleted by non-admins
    if (book.is_global && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Global library books can only be deleted by an administrator.' },
        { status: 403 }
      );
    }

    // Non-admins cannot delete other users' private books
    if (!book.is_global && book.owner_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete this book.' },
        { status: 403 }
      );
    }

    // 1. Delete record from database (cascades to notes, highlights, bookmarks, reading_progress)
    const { error: deleteDbError } = await supabase
      .from('books')
      .delete()
      .eq('id', params.id);

    if (deleteDbError) {
      return NextResponse.json({ error: deleteDbError.message }, { status: 500 });
    }

    // 2. Remove file from Supabase Storage
    if (book.file_path) {
      const adminSupabase = createAdminClient();
      await adminSupabase.storage.from('books').remove([book.file_path]);
    }

    return NextResponse.json({ success: true, message: 'Book deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = (profile as any)?.role === 'admin';

    const body = await request.json();
    const { title, author, category, total_pages } = body;

    const updates: any = {};
    if (title) updates.title = title.trim();
    if (author !== undefined) updates.author = author.trim();
    if (category) updates.category = category.trim();
    if (total_pages && typeof total_pages === 'number') updates.total_pages = total_pages;

    let query = supabase.from('books').update(updates).eq('id', params.id);
    if (!isAdmin) {
      query = query.eq('owner_id', user.id).eq('is_global', false);
    }

    const { data: updatedBook, error: updateError } = await query.select().single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ book: updatedBook });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
