import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    const prof = profile as any;
    if (!prof || prof.role !== 'admin' || !prof.is_active) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalBooks, data: booksData },
      { count: globalBooks },
      { count: totalNotes },
      { count: totalHighlights },
    ] = await Promise.all([
      adminSupabase.from('profiles').select('*', { count: 'exact', head: true }),
      adminSupabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      adminSupabase.from('books').select('file_size', { count: 'exact' }),
      adminSupabase.from('books').select('*', { count: 'exact', head: true }).eq('is_global', true),
      adminSupabase.from('notes').select('*', { count: 'exact', head: true }),
      adminSupabase.from('highlights').select('*', { count: 'exact', head: true }),
    ]);

    const totalStorageBytes = ((booksData as any) || []).reduce((acc: number, b: any) => acc + (Number(b.file_size) || 0), 0);
    const userUploadedBooks = (totalBooks || 0) - (globalBooks || 0);

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalBooks: totalBooks || 0,
        globalBooks: globalBooks || 0,
        userUploadedBooks: userUploadedBooks >= 0 ? userUploadedBooks : 0,
        totalNotes: totalNotes || 0,
        totalHighlights: totalHighlights || 0,
        totalStorageBytes,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
