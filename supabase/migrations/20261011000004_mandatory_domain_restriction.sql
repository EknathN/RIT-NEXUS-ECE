-- ============================================================================
-- RIT ECE PROFESSIONAL NETWORKING PLATFORM
-- Migration: 20261011000004_mandatory_domain_restriction.sql
-- Description: Enforce mandatory college email domain (@ece.ritchennai.edu.in),
--              email confirmation requirement, and strict role immutability
-- ============================================================================

-- 1. Helper function: Strict Domain Validation Function
-- Rejects any email that does not have domain 'ece.ritchennai.edu.in' exactly.
-- Prevents substring vulnerabilities (e.g. fakeece.ritchennai.edu.in, ece.ritchennai.com).
CREATE OR REPLACE FUNCTION public.is_valid_ece_email(email_str TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    normalized_email TEXT;
    email_domain TEXT;
    local_part TEXT;
BEGIN
    IF email_str IS NULL OR length(trim(email_str)) = 0 THEN
        RETURN FALSE;
    END IF;

    normalized_email := lower(trim(email_str));
    
    -- Must have exactly one '@' character
    IF (array_length(string_to_array(normalized_email, '@'), 1) <> 2) THEN
        RETURN FALSE;
    END IF;

    local_part := split_part(normalized_email, '@', 1);
    email_domain := split_part(normalized_email, '@', 2);

    -- Local part cannot be empty
    IF length(local_part) = 0 THEN
        RETURN FALSE;
    END IF;

    -- Strict exact match for domain (ignoring case)
    RETURN email_domain = 'ece.ritchennai.edu.in';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Add CHECK Constraint to public.profiles table
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS chk_mandatory_ece_domain;

ALTER TABLE public.profiles
ADD CONSTRAINT chk_mandatory_ece_domain
CHECK (public.is_valid_ece_email(email));

-- 3. Trigger Function on auth.users (intercepts Supabase Auth registrations)
CREATE OR REPLACE FUNCTION public.validate_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email := lower(trim(NEW.email));

    IF NOT public.is_valid_ece_email(NEW.email) THEN
        RAISE EXCEPTION 'Registration denied: Only verified institutional emails ending in @ece.ritchennai.edu.in are permitted.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_auth_user_domain ON auth.users;
CREATE TRIGGER trg_validate_auth_user_domain
    BEFORE INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.validate_new_auth_user();

-- 4. Update handle_new_user to strictly handle email confirmation and roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role user_role_type;
BEGIN
    -- Ensure email domain is strictly valid
    IF NOT public.is_valid_ece_email(NEW.email) THEN
        RAISE EXCEPTION 'Registration denied: Only institutional @ece.ritchennai.edu.in addresses are permitted.';
    END IF;

    -- Extract requested role, default to student (never allow self-assignment of admin or moderator)
    user_role := 'student'::user_role_type;
    IF (NEW.raw_user_meta_data->>'role') IN ('student', 'alumni') THEN
        user_role := (NEW.raw_user_meta_data->>'role')::user_role_type;
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        verification_status
    ) VALUES (
        NEW.id,
        lower(trim(NEW.email)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        user_role,
        'unverified'::verification_status_type
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email;

    INSERT INTO public.user_roles (
        user_id,
        role
    ) VALUES (
        NEW.id,
        user_role
    ) ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper function to check if authenticated user has confirmed their email
CREATE OR REPLACE FUNCTION public.is_email_confirmed(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = user_uuid AND email_confirmed_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enforce Email Confirmation on Protected Actions via RLS
-- Unconfirmed users cannot publish posts, send messages, or apply for jobs.
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = author_id AND
    public.is_email_confirmed(auth.uid())
);

DROP POLICY IF EXISTS "Users can send messages to their conversations only" ON public.messages;
CREATE POLICY "Users can send messages to their conversations only"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id AND
    public.is_email_confirmed(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Applicants can submit application" ON public.job_applications;
CREATE POLICY "Applicants can submit application"
ON public.job_applications FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = applicant_id AND
    public.is_email_confirmed(auth.uid())
);
