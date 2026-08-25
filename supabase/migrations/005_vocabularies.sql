-- ==============================================================================
-- 005_vocabularies.sql: Vocabulary Table & Translation Persistence
-- ==============================================================================

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

-- Indexes for lightning fast lookups per user, book, and page
CREATE INDEX IF NOT EXISTS idx_vocabularies_user_book_page ON public.vocabularies(user_id, book_id, page_number);
CREATE INDEX IF NOT EXISTS idx_vocabularies_book_id ON public.vocabularies(book_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vocabularies ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: User can only view their own vocabularies
CREATE POLICY "Users can view own vocabularies"
    ON public.vocabularies
    FOR SELECT
    USING (auth.uid() = user_id);

-- 2. INSERT Policy: User can only insert vocabularies with their own user_id
CREATE POLICY "Users can create own vocabularies"
    ON public.vocabularies
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE Policy: User can only update their own vocabularies
CREATE POLICY "Users can update own vocabularies"
    ON public.vocabularies
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. DELETE Policy: User can only delete their own vocabularies
CREATE POLICY "Users can delete own vocabularies"
    ON public.vocabularies
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for auto updated_at
DROP TRIGGER IF EXISTS set_vocabularies_updated_at ON public.vocabularies;
CREATE TRIGGER set_vocabularies_updated_at
    BEFORE UPDATE ON public.vocabularies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
