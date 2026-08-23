-- =============================================================================
-- Migration 002: Storage Buckets & Storage Security Policies
-- =============================================================================

-- 1. Create 'books' storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'books',
    'books',
    false, -- Private bucket, accessed via signed URLs or authenticated RLS
    262144000, -- 250 MB max file size limit
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

-- 2. Storage Objects RLS Policies

-- Policy 1: Anyone authenticated can read global books
CREATE POLICY "Authenticated users can read global books"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'books' AND
    (storage.foldername(name))[1] = 'global'
);

-- Policy 2: Users can read their own uploaded books in user/<user_id>/*
CREATE POLICY "Users can read their own uploaded books"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'books' AND
    (storage.foldername(name))[1] = 'user' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 3: Users can upload to their own folder user/<user_id>/*
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'books' AND
    (storage.foldername(name))[1] = 'user' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 4: Users can delete their own uploaded books
CREATE POLICY "Users can delete their own uploaded books"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'books' AND
    (storage.foldername(name))[1] = 'user' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy 5: Admins can read, upload, and delete all objects in the books bucket
CREATE POLICY "Admins have full access to books storage"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'books' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.is_active = true
    )
);
