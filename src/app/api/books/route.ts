import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MAX_BOOK_SIZE_BYTES, SUPPORTED_EXTENSIONS } from '@/lib/constants';
import * as crypto from 'crypto';

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
    const tab = searchParams.get('tab') || 'all'; // 'all', 'global', 'my', 'recent'
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'recent'; // 'recent', 'title', 'progress'

    let query = supabase.from('books').select(`
      *,
      reading_progress (
        page_number,
        progress,
        updated_at
      )
    `);

    // Tab filter
    if (tab === 'global') {
      query = query.eq('is_global', true);
    } else if (tab === 'my') {
      query = query.eq('owner_id', user.id).eq('is_global', false);
    } else {
      // 'all': accessible books (RLS handles this: is_global=true OR owner_id=user.id)
    }

    // Category filter
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    // Search filter
    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`title.ilike.%${s}%,author.ilike.%${s}%,category.ilike.%${s}%`);
    }

    // Sorting
    if (sort === 'title') {
      query = query.order('title', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: books, error: dbError } = await query;

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Map reading progress to single object per book
    const mappedBooks = (books || []).map((b: any) => {
      const userProgress = Array.isArray(b.reading_progress)
        ? b.reading_progress[0] || null
        : b.reading_progress || null;

      return {
        ...b,
        progress: userProgress,
      };
    });

    // If sorting by progress
    if (sort === 'progress') {
      mappedBooks.sort((a, b) => {
        const progA = a.progress?.progress || 0;
        const progB = b.progress?.progress || 0;
        return progB - progA;
      });
    }

    return NextResponse.json({ books: mappedBooks });
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

    // Check if user is active
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    const prof = profile as any;
    if (!prof || !prof.is_active) {
      return NextResponse.json({ error: 'User account is inactive or disabled' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const titleInput = formData.get('title') as string | null;
    const authorInput = formData.get('author') as string | null;
    const categoryInput = formData.get('category') as string | null;
    const isGlobalInput = formData.get('is_global') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 1. Extension & MIME Validation
    const fileName = file.name;
    const dotIndex = fileName.lastIndexOf('.');
    const ext = dotIndex !== -1 ? fileName.substring(dotIndex).toLowerCase() : '';

    if (!SUPPORTED_EXTENSIONS.includes(ext as any)) {
      return NextResponse.json(
        { error: `Unsupported format. Allowed: ${SUPPORTED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // 2. File size limit validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_BOOK_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds limit of ${MAX_BOOK_SIZE_BYTES / (1024 * 1024)} MB` },
        { status: 400 }
      );
    }

    // 3. Duplicate check via SHA-256 checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    const { data: existingBook } = await supabase
      .from('books')
      .select('id, title, is_global, owner_id')
      .eq('checksum', checksum)
      .maybeSingle();

    if (existingBook) {
      if (existingBook.owner_id === user.id || existingBook.is_global) {
        return NextResponse.json(
          { error: `This book already exists in your library: "${existingBook.title}"` },
          { status: 409 }
        );
      }
    }

    // 4. Role-based global book check
    const isGlobal = isGlobalInput && prof.role === 'admin';
    const category = (categoryInput || 'General').trim();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = isGlobal
      ? `global/${category.toLowerCase()}/${Date.now()}_${cleanFileName}`
      : `user/${user.id}/${Date.now()}_${cleanFileName}`;

    // 5. Upload to Supabase Storage
    const adminSupabase = createAdminClient();
    const { error: uploadError } = await adminSupabase.storage
      .from('books')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 6. Create database record
    const fileType = ext.replace('.', '');
    const title = (titleInput || fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')).trim();
    const author = (authorInput || 'Unknown').trim();

    const { data: newBook, error: dbError } = await supabase
      .from('books')
      .insert({
        title,
        author,
        description: `${fileType.toUpperCase()} book uploaded by ${prof.role === 'admin' && isGlobal ? 'Admin' : 'User'}`,
        file_name: fileName,
        file_path: storagePath,
        file_type: fileType as any,
        file_size: buffer.length,
        checksum,
        category,
        cover_url: null,
        total_pages: 1,
        owner_id: isGlobal ? user.id : user.id,
        is_global: isGlobal,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback storage file
      await adminSupabase.storage.from('books').remove([storagePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ book: newBook }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
