-- =============================================================================
-- Migration 003: Row Level Security (RLS) Policies
-- =============================================================================

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is active admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 1. Profiles Table Policies
-- -----------------------------------------------------------------------------
-- Users can view their own profile; admins can view all profiles
CREATE POLICY "Users can view own profile or admin can view all"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

-- Users can update their own display_name; admins can update any profile (roles/is_active)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (
    -- Non-admin users cannot change their own role or is_active status
    (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND is_active = true)
    OR public.is_admin()
);

-- Admin can delete user profile (except cannot delete self via business rule)
CREATE POLICY "Admin can delete user profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.is_admin() AND auth.uid() <> id);

-- -----------------------------------------------------------------------------
-- 2. Books Table Policies
-- -----------------------------------------------------------------------------
-- Users can view global books, their own uploaded books, or books shared with them
CREATE POLICY "Users can view accessible books"
ON public.books FOR SELECT
TO authenticated
USING (
    is_global = true
    OR owner_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.book_access
        WHERE book_access.book_id = books.id AND book_access.user_id = auth.uid()
    )
);

-- Users can insert their own books (owner_id = auth.uid(), is_global = false); Admins can insert global books
CREATE POLICY "Users and admins can insert books"
ON public.books FOR INSERT
TO authenticated
WITH CHECK (
    (owner_id = auth.uid() AND is_global = false)
    OR (public.is_admin() AND is_global = true)
);

-- Users can update only their own books; Admins can update any book
CREATE POLICY "Users can update own books or admin any"
ON public.books FOR UPDATE
TO authenticated
USING (owner_id = auth.uid() OR public.is_admin())
WITH CHECK (
    (owner_id = auth.uid() AND is_global = false)
    OR public.is_admin()
);

-- Users can delete only their own books; Admins can delete any book
CREATE POLICY "Users can delete own books or admin any"
ON public.books FOR DELETE
TO authenticated
USING (
    (owner_id = auth.uid() AND is_global = false)
    OR public.is_admin()
);

-- -----------------------------------------------------------------------------
-- 3. Notes Table Policies (Strict User Isolation)
-- -----------------------------------------------------------------------------
CREATE POLICY "Users have full control over own notes"
ON public.notes FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. Highlights Table Policies (Strict User Isolation)
-- -----------------------------------------------------------------------------
CREATE POLICY "Users have full control over own highlights"
ON public.highlights FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. Bookmarks Table Policies (Strict User Isolation)
-- -----------------------------------------------------------------------------
CREATE POLICY "Users have full control over own bookmarks"
ON public.bookmarks FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. Tags & Book Tags Policies (Strict User Isolation)
-- -----------------------------------------------------------------------------
CREATE POLICY "Users have full control over own tags"
ON public.tags FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users have full control over own book tags"
ON public.book_tags FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 7. Reading Progress Policies (Strict User Isolation)
-- -----------------------------------------------------------------------------
CREATE POLICY "Users have full control over own reading progress"
ON public.reading_progress FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 8. Book Access Sharing Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view granted access"
ON public.book_access FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR granted_by = auth.uid() OR public.is_admin());

CREATE POLICY "Book owners can grant access"
ON public.book_access FOR INSERT
TO authenticated
WITH CHECK (
    granted_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.books WHERE id = book_id AND owner_id = auth.uid())
);
