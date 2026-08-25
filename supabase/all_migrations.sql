-- =============================================================================
-- ALL IN ONE MIGRATION FOR READBOOK (Run in Supabase SQL Editor)
-- =============================================================================

-- =============================================================================
-- Migration 001: Initial Schema
-- =============================================================================

-- 1. Create User Role Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    role user_role NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Books Table
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'epub', 'mobi', 'fb2', 'cbz')),
    file_size BIGINT NOT NULL DEFAULT 0,
    checksum TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    cover_url TEXT,
    total_pages INTEGER NOT NULL DEFAULT 1,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_global BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast library filtering & search
CREATE INDEX IF NOT EXISTS idx_books_owner ON public.books(owner_id);
CREATE INDEX IF NOT EXISTS idx_books_is_global ON public.books(is_global);
CREATE INDEX IF NOT EXISTS idx_books_category ON public.books(category);
CREATE INDEX IF NOT EXISTS idx_books_checksum ON public.books(checksum);

-- 4. Book Access Table
CREATE TABLE IF NOT EXISTS public.book_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (book_id, user_id)
);

-- 5. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, book_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_notes_user_book ON public.notes(user_id, book_id);

-- 6. Highlights Table
CREATE TABLE IF NOT EXISTS public.highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    selected_text TEXT NOT NULL,
    rectangles JSONB NOT NULL DEFAULT '[]'::jsonb,
    color TEXT NOT NULL DEFAULT '#f9e2af',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_highlights_user_book ON public.highlights(user_id, book_id);

-- 7. Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_book ON public.bookmarks(user_id, book_id);

-- 8. Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#89b4fa',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, name)
);

-- 9. Book Tags Association Table
CREATE TABLE IF NOT EXISTS public.book_tags (
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (book_id, tag_id, user_id, page_number)
);

-- 10. Reading Progress Table
CREATE TABLE IF NOT EXISTS public.reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    progress DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 100.0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON public.reading_progress(user_id);


-- =============================================================================
-- Migration 002: Storage Buckets & Storage Security Policies
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'books',
    'books',
    false,
    262144000,
    ARRAY[
        'application/pdf',
        'application/epub+zip',
        'application/x-mobipocket-ebook',
        'application/x-fictionbook+xml',
        'application/vnd.comicbook+zip'
    ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 262144000,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/epub+zip',
        'application/x-mobipocket-ebook',
        'application/x-fictionbook+xml',
        'application/vnd.comicbook+zip'
    ]::text[];

-- Storage Object Policies
DO $$ BEGIN
    CREATE POLICY "Authenticated users can read global books"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'books' AND (storage.foldername(name))[1] = 'global');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can read their own uploaded books"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'books' AND (storage.foldername(name))[1] = 'user' AND (storage.foldername(name))[2] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can upload to their own folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'books' AND (storage.foldername(name))[1] = 'user' AND (storage.foldername(name))[2] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own uploaded books"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'books' AND (storage.foldername(name))[1] = 'user' AND (storage.foldername(name))[2] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins have full access to books storage"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'books' AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true));
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- =============================================================================
-- Migration 003: Row Level Security (RLS) Policies
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
DO $$ BEGIN
    CREATE POLICY "Users can view own profile or admin can view all"
    ON public.profiles FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK ((auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND is_active = true) OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admin can delete user profiles"
    ON public.profiles FOR DELETE TO authenticated
    USING (public.is_admin() AND auth.uid() <> id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Books Policies
DO $$ BEGIN
    CREATE POLICY "Users can view accessible books"
    ON public.books FOR SELECT TO authenticated
    USING (is_global = true OR owner_id = auth.uid() OR public.is_admin() OR EXISTS (SELECT 1 FROM public.book_access WHERE book_access.book_id = books.id AND book_access.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users and admins can insert books"
    ON public.books FOR INSERT TO authenticated
    WITH CHECK ((owner_id = auth.uid() AND is_global = false) OR (public.is_admin() AND is_global = true));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own books or admin any"
    ON public.books FOR UPDATE TO authenticated
    USING (owner_id = auth.uid() OR public.is_admin())
    WITH CHECK ((owner_id = auth.uid() AND is_global = false) OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own books or admin any"
    ON public.books FOR DELETE TO authenticated
    USING ((owner_id = auth.uid() AND is_global = false) OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Other Tables RLS Policies
DO $$ BEGIN
    CREATE POLICY "Users have full control over own notes"
    ON public.notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users have full control over own highlights"
    ON public.highlights FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users have full control over own bookmarks"
    ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users have full control over own tags"
    ON public.tags FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users have full control over own book tags"
    ON public.book_tags FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users have full control over own reading progress"
    ON public.reading_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view granted access"
    ON public.book_access FOR SELECT TO authenticated USING (user_id = auth.uid() OR granted_by = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Book owners can grant access"
    ON public.book_access FOR INSERT TO authenticated
    WITH CHECK (granted_by = auth.uid() AND EXISTS (SELECT 1 FROM public.books WHERE id = book_id AND owner_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- =============================================================================
-- Migration 004: Triggers & Auto Timestamps
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_user BOOLEAN;
    assigned_role public.user_role := 'user';
BEGIN
    SELECT (COUNT(*) = 0) INTO is_first_user FROM public.profiles;
    IF is_first_user THEN
        assigned_role := 'admin';
    END IF;

    IF (NEW.raw_user_meta_data->>'role') = 'admin' THEN
        assigned_role := 'admin';
    END IF;

    INSERT INTO public.profiles (id, email, display_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        assigned_role,
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_books_updated_at ON public.books;
CREATE TRIGGER set_books_updated_at
    BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_notes_updated_at ON public.notes;
CREATE TRIGGER set_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_highlights_updated_at ON public.highlights;
CREATE TRIGGER set_highlights_updated_at
    BEFORE UPDATE ON public.highlights
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_reading_progress_updated_at ON public.reading_progress;
CREATE TRIGGER set_reading_progress_updated_at
    BEFORE UPDATE ON public.reading_progress
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- =============================================================================
-- Migration 005: Vocabularies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vocabularies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL CHECK (page_number >= 1),
    word TEXT NOT NULL,
    ipa TEXT,
    translation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_vocabularies_user_book_page ON public.vocabularies(user_id, book_id, page_number);
CREATE INDEX IF NOT EXISTS idx_vocabularies_book_id ON public.vocabularies(book_id);

ALTER TABLE public.vocabularies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view own vocabularies"
    ON public.vocabularies FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own vocabularies"
    ON public.vocabularies FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own vocabularies"
    ON public.vocabularies FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own vocabularies"
    ON public.vocabularies FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP TRIGGER IF EXISTS set_vocabularies_updated_at ON public.vocabularies;
CREATE TRIGGER set_vocabularies_updated_at
    BEFORE UPDATE ON public.vocabularies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
