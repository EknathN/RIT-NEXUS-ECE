-- ============================================================================
-- RIT ECE PROFESSIONAL NETWORKING PLATFORM
-- Migration: 20261011000003_storage_buckets.sql
-- Description: Supabase Storage buckets & access policies (Public vs Private)
-- ============================================================================

-- Insert standard storage buckets into storage.buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('post_media', 'post_media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']),
    ('resumes', 'resumes', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('verification_docs', 'verification_docs', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- STORAGE POLICIES: AVATARS (Public Read, Owner Write)
-- ----------------------------------------------------------------------------
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ----------------------------------------------------------------------------
-- STORAGE POLICIES: POST MEDIA (Public Read, Authenticated Write)
-- ----------------------------------------------------------------------------
CREATE POLICY "Post media is publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post_media');

CREATE POLICY "Authenticated users can upload post media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post_media');

-- ----------------------------------------------------------------------------
-- STORAGE POLICIES: RESUMES (Private - Owner & Employer Only)
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can upload their own resume"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own resume or authorized reviewers"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'resumes' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'faculty')
        )
    )
);

-- ----------------------------------------------------------------------------
-- STORAGE POLICIES: VERIFICATION DOCS (Private - Owner & Admin Only)
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can upload their ID cards for verification"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification_docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Only owner and admins can view verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'verification_docs' AND (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    )
);
