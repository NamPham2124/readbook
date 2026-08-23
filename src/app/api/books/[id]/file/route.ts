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

    // 1. Verify user can access this book
    const { data: book, error: dbError } = await supabase
      .from('books')
      .select('id, file_path, file_type, file_name, is_global, owner_id')
      .eq('id', params.id)
      .single();

    if (dbError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Check permissions via RLS or explicit check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = (profile as any)?.role === 'admin';

    if (!book.is_global && book.owner_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this book file.' }, { status: 403 });
    }

    // 2. Generate signed download URL for Supabase Storage
    const adminSupabase = createAdminClient();
    const { data: signedData, error: signError } = await adminSupabase.storage
      .from('books')
      .createSignedUrl(book.file_path, 3600); // 1 hour validity

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: `Failed to generate signed URL: ${signError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signedData.signedUrl,
      file_type: book.file_type,
      file_name: book.file_name,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
