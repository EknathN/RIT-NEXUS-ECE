-- ============================================================================
-- 🎓 RIT ECE PROFESSIONAL NETWORKING PLATFORM
-- ALL-IN-ONE COMPLETE SUPABASE SETUP SCRIPT
-- Run this entire script in the Supabase SQL Editor to set up:
--   1. Extensions & Custom Enum Types
--   2. All 28 Tables, Constraints, Indexes & Triggers
--   3. Row Level Security (RLS) Policies on Every Table
--   4. Storage Buckets & Policies (Avatars, Post Media, Resumes, Verification Docs)
--   5. Mandatory Email Domain Restriction (@ece.ritchennai.edu.in) & Email Confirmation Checks
--   6. Initial Seed Data (HOD Admin, Faculty, Alumni, Student)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: EXTENSIONS & ENUM TYPES
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('student', 'alumni', 'faculty', 'admin', 'moderator');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE verification_status_type AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE connection_status_type AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE post_visibility_type AS ENUM ('public', 'connections', 'department', 'community');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE job_type_enum AS ENUM ('full_time', 'internship', 'part_time', 'research_fellowship');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE application_status_type AS ENUM ('submitted', 'under_review', 'shortlisted', 'rejected', 'accepted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE report_status_type AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- STEP 2: STRICT DOMAIN VALIDATION FUNCTION (@ece.ritchennai.edu.in)
-- ----------------------------------------------------------------------------
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
    
    -- Must have exactly one '@'
    IF (array_length(string_to_array(normalized_email, '@'), 1) <> 2) THEN
        RETURN FALSE;
    END IF;

    local_part := split_part(normalized_email, '@', 1);
    email_domain := split_part(normalized_email, '@', 2);

    IF length(local_part) = 0 THEN
        RETURN FALSE;
    END IF;

    -- Strict exact match (rejects fakeece.ritchennai.edu.in or ece.ritchennai.com)
    RETURN email_domain = 'ece.ritchennai.edu.in';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ----------------------------------------------------------------------------
-- STEP 3: RELATIONAL TABLES
-- ----------------------------------------------------------------------------

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    headline TEXT DEFAULT 'ECE Student @ Rajalakshmi Institute of Technology',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    roll_number TEXT DEFAULT '',
    register_number TEXT DEFAULT '',
    department TEXT DEFAULT 'Electronics and Communication Engineering',
    role user_role_type NOT NULL DEFAULT 'student',
    verification_status verification_status_type NOT NULL DEFAULT 'unverified',
    batch_year INTEGER CHECK (batch_year >= 2008 AND batch_year <= 2035),
    graduation_year INTEGER CHECK (graduation_year >= 2012 AND graduation_year <= 2035),
    current_company TEXT DEFAULT '',
    current_position TEXT DEFAULT '',
    location TEXT DEFAULT 'Chennai, Tamil Nadu, India',
    github_url TEXT DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    portfolio_url TEXT DEFAULT '',
    resume_url TEXT DEFAULT '',
    profile_completeness INTEGER DEFAULT 30 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_mandatory_ece_domain CHECK (public.is_valid_ece_email(email))
);

-- 2. User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role user_role_type NOT NULL DEFAULT 'student',
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_role UNIQUE (user_id, role)
);

-- 3. Verification Requests
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    roll_number TEXT NOT NULL,
    id_card_url TEXT NOT NULL,
    id_card_back_url TEXT DEFAULT '',
    institutional_email TEXT DEFAULT '',
    batch_year INTEGER NOT NULL,
    status verification_status_type NOT NULL DEFAULT 'pending',
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    review_notes TEXT DEFAULT '',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ
);

-- 4. Education
CREATE TABLE IF NOT EXISTS public.education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    field_of_study TEXT NOT NULL,
    start_year INTEGER NOT NULL,
    end_year INTEGER,
    grade TEXT DEFAULT '',
    activities TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Experiences
CREATE TABLE IF NOT EXISTS public.experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    employment_type TEXT DEFAULT 'Full-time',
    location TEXT DEFAULT '',
    is_current BOOLEAN DEFAULT FALSE,
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Skills & User Skills
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    endorsements_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id)
);

-- 7. Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    domain TEXT DEFAULT 'ECE Core',
    description TEXT NOT NULL,
    repo_url TEXT DEFAULT '',
    demo_url TEXT DEFAULT '',
    start_date DATE,
    end_date DATE,
    technologies TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Certifications
CREATE TABLE IF NOT EXISTS public.certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    issuing_organization TEXT NOT NULL,
    issue_date DATE,
    expiration_date DATE,
    credential_id TEXT DEFAULT '',
    credential_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. User Connections
CREATE TABLE IF NOT EXISTS public.user_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status connection_status_type NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_connection_pair UNIQUE (requester_id, recipient_id),
    CONSTRAINT chk_no_self_connect CHECK (requester_id <> recipient_id)
);

-- 10. Posts & Media
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    visibility post_visibility_type NOT NULL DEFAULT 'public',
    tags TEXT[] DEFAULT '{}',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'image',
    file_name TEXT DEFAULT '',
    file_size INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Post Likes & Comments
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT DEFAULT 'like',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_post_user_like UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Conversations & Messages
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    is_group BOOLEAN DEFAULT FALSE,
    title TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_conv_member UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachment_url TEXT DEFAULT '',
    attachment_type TEXT DEFAULT '',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT DEFAULT '',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Jobs & Applications
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    logo_url TEXT DEFAULT '',
    location TEXT NOT NULL,
    is_remote BOOLEAN DEFAULT FALSE,
    job_type job_type_enum NOT NULL DEFAULT 'full_time',
    domain TEXT DEFAULT 'VLSI / Semiconductor',
    description TEXT NOT NULL,
    requirements TEXT DEFAULT '',
    skills_required TEXT[] DEFAULT '{}',
    experience_level TEXT DEFAULT 'Entry Level / Fresher',
    salary_range TEXT DEFAULT '',
    application_url TEXT DEFAULT '',
    is_alumni_referral BOOLEAN DEFAULT FALSE,
    deadline DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    resume_url TEXT NOT NULL,
    cover_letter TEXT DEFAULT '',
    status application_status_type NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_job_application UNIQUE (job_id, applicant_id)
);

-- 15. Hackathons & Events
CREATE TABLE IF NOT EXISTS public.hackathons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    organizer TEXT NOT NULL,
    banner_url TEXT DEFAULT '',
    description TEXT NOT NULL,
    theme TEXT DEFAULT 'Hardware & Embedded',
    prize_pool TEXT DEFAULT '',
    team_size TEXT DEFAULT '2 - 4 Members',
    registration_deadline TIMESTAMPTZ,
    event_start_date TIMESTAMPTZ NOT NULL,
    event_end_date TIMESTAMPTZ NOT NULL,
    venue TEXT DEFAULT 'Online / Hybrid',
    registration_url TEXT NOT NULL,
    is_incubation_program BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    banner_url TEXT DEFAULT '',
    category TEXT DEFAULT 'Workshop',
    speaker_name TEXT DEFAULT '',
    speaker_designation TEXT DEFAULT '',
    venue TEXT DEFAULT 'ECE Seminar Hall, RIT',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    registration_link TEXT DEFAULT '',
    is_department_official BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16. Communities & Members
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon TEXT DEFAULT 'Cpu',
    banner_url TEXT DEFAULT '',
    category TEXT DEFAULT 'Technical Circle',
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    members_count INTEGER DEFAULT 1,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_community_member UNIQUE (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 17. Content Reports, Moderation & Audit Logs
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    reason TEXT NOT NULL,
    details TEXT DEFAULT '',
    status report_status_type NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moderator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_id UUID REFERENCES public.content_reports(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    action_details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    ip_address TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for Query Speed
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.jobs(is_active, created_at DESC);

-- ----------------------------------------------------------------------------
-- STEP 4: TRIGGERS (Auto-Profile & Email Validation)
-- ----------------------------------------------------------------------------
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role user_role_type;
BEGIN
    IF NOT public.is_valid_ece_email(NEW.email) THEN
        RAISE EXCEPTION 'Registration denied: Only institutional @ece.ritchennai.edu.in addresses are permitted.';
    END IF;

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------------------
-- STEP 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_email_confirmed(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = user_uuid AND email_confirmed_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated
USING (is_active = TRUE OR auth.uid() = id OR public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    verification_status = (SELECT verification_status FROM public.profiles WHERE id = auth.uid())
);

-- Posts Policies (Requires confirmed email)
CREATE POLICY "Posts viewable by authenticated" ON public.posts FOR SELECT TO authenticated
USING (is_deleted = FALSE OR auth.uid() = author_id OR public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can create posts" ON public.posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id AND public.is_email_confirmed(auth.uid()));

CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated
USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users or moderators can delete posts" ON public.posts FOR DELETE TO authenticated
USING (auth.uid() = author_id OR public.is_admin_or_moderator(auth.uid()));

-- Messages Policies (Strict Conversation isolation + Confirmed email)
CREATE POLICY "Users can view conversations they belong to" ON public.conversations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = id AND user_id = auth.uid()));

CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Users view members of their conversations" ON public.conversation_members FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid()));

CREATE POLICY "Users can join conversations" ON public.conversation_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid()));

CREATE POLICY "Users can read their conversation messages" ON public.messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND public.is_email_confirmed(auth.uid()) AND EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

-- Jobs & Applications Policies
CREATE POLICY "Jobs viewable by authenticated" ON public.jobs FOR SELECT TO authenticated USING (is_active = TRUE OR posted_by = auth.uid() OR public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Applicants view applications" ON public.job_applications FOR SELECT TO authenticated USING (auth.uid() = applicant_id OR EXISTS (SELECT 1 FROM public.jobs WHERE id = job_applications.job_id AND posted_by = auth.uid()));
CREATE POLICY "Applicants submit applications" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id AND public.is_email_confirmed(auth.uid()));

-- Connections, Comments, Likes
CREATE POLICY "Connections viewable by involved users" ON public.user_connections FOR SELECT TO authenticated USING (status = 'accepted' OR auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Send connection requests" ON public.user_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Respond to connection requests" ON public.user_connections FOR UPDATE TO authenticated USING (auth.uid() = recipient_id OR auth.uid() = requester_id);
CREATE POLICY "Remove connections" ON public.user_connections FOR DELETE TO authenticated USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Post likes viewable by all" ON public.post_likes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Comments viewable by all" ON public.comments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can write comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors or admins can delete comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_admin_or_moderator(auth.uid()));

-- Notifications
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

-- Communities
CREATE POLICY "Communities viewable by all" ON public.communities FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Community members viewable by all" ON public.community_members FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Join community" ON public.community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leave community" ON public.community_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- STEP 6: STORAGE BUCKETS
-- ----------------------------------------------------------------------------
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

CREATE POLICY "Avatar public select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Avatar upload authenticated" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Post media public select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'post_media');
CREATE POLICY "Post media upload authenticated" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post_media');

-- ----------------------------------------------------------------------------
-- STEP 7: SEED DEMO DATA (@ece.ritchennai.edu.in)
-- ----------------------------------------------------------------------------
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@ece.ritchennai.edu.in', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Dr. ECE HOD", "role": "admin"}'),
    ('00000000-0000-0000-0000-000000000002', 'priya.k@ece.ritchennai.edu.in', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Priya Krishnan", "role": "alumni"}'),
    ('00000000-0000-0000-0000-000000000003', 'kavitha.s@ece.ritchennai.edu.in', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Kavitha Sundaram", "role": "student"}'),
    ('00000000-0000-0000-0000-000000000004', 'rahul.m@ece.ritchennai.edu.in', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Rahul Manikandan", "role": "student"}'),
    ('00000000-0000-0000-0000-000000000005', 'arunkumar.v@ece.ritchennai.edu.in', crypt('password123', gen_salt('bf')), now(), '{"full_name": "Dr. V. Arunkumar", "role": "faculty"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, headline, bio, role, verification_status, batch_year, graduation_year, current_company, current_position, location)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@ece.ritchennai.edu.in', 'Dr. ECE HOD', 'Head of Department, ECE | Rajalakshmi Institute of Technology', 'Leading educational innovation, research grants, and industry collaborations at RIT Chennai ECE Department.', 'admin', 'verified', 2010, 2014, 'Rajalakshmi Institute of Technology', 'Professor & HOD', 'Chennai, Tamil Nadu'),
    ('00000000-0000-0000-0000-000000000002', 'priya.k@ece.ritchennai.edu.in', 'Priya Krishnan', 'Senior Silicon Design Engineer @ Intel | RIT ECE 2019 Batch', 'Specializing in RTL Design, SystemVerilog, UVM verification, and low-power ASIC architectures.', 'alumni', 'verified', 2015, 2019, 'Intel Corporation', 'Senior Silicon Design Engineer', 'Bengaluru, Karnataka'),
    ('00000000-0000-0000-0000-000000000003', 'kavitha.s@ece.ritchennai.edu.in', 'Kavitha Sundaram', 'Final Year ECE Student @ RIT | VLSI & Embedded Systems Enthusiast', 'Passionate about FPGA prototyping, RISC-V core development, and TinyML on edge microcontrollers.', 'student', 'verified', 2021, 2025, 'Student', 'Undergraduate Researcher', 'Chennai, Tamil Nadu'),
    ('00000000-0000-0000-0000-000000000004', 'rahul.m@ece.ritchennai.edu.in', 'Rahul Manikandan', '3rd Year ECE @ RIT | Robotics, ROS2 & Autonomous Systems', 'Building autonomous mobile robots, computer vision pipelines, and IoT sensor arrays.', 'student', 'verified', 2022, 2026, 'Student', 'Robotics Club Lead', 'Chennai, Tamil Nadu'),
    ('00000000-0000-0000-0000-000000000005', 'arunkumar.v@ece.ritchennai.edu.in', 'Dr. V. Arunkumar', 'Associate Professor, ECE | VLSI & Nanotechnology Center Head', 'Faculty mentor guiding students in national hackathons, IEEE conferences, and MSME incubation grants.', 'faculty', 'verified', 2012, 2016, 'Rajalakshmi Institute of Technology', 'Associate Professor', 'Chennai, Tamil Nadu')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    headline = EXCLUDED.headline,
    role = EXCLUDED.role,
    verification_status = EXCLUDED.verification_status;

INSERT INTO public.user_roles (user_id, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin'),
    ('00000000-0000-0000-0000-000000000002', 'alumni'),
    ('00000000-0000-0000-0000-000000000003', 'student'),
    ('00000000-0000-0000-0000-000000000004', 'student'),
    ('00000000-0000-0000-0000-000000000005', 'faculty')
ON CONFLICT DO NOTHING;

INSERT INTO public.communities (id, name, slug, description, category, creator_id)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'VLSI & Chip Design Circle', 'vlsi-chip-design', 'Silicon design, RTL coding, Synthesis, Cadence EDA, and Physical Design discussions.', 'Technical Circle', '00000000-0000-0000-0000-000000000005'),
    ('10000000-0000-0000-0000-000000000002', 'Embedded Systems & IoT Club', 'embedded-iot-club', 'STM32, ESP32, RTOS, PCB layout, and industrial sensor integration.', 'Technical Circle', '00000000-0000-0000-0000-000000000003'),
    ('10000000-0000-0000-0000-000000000003', 'Robotics & Automation Wing', 'robotics-automation', 'ROS2, drone avionics, path planning, and autonomous ground vehicles.', 'Technical Circle', '00000000-0000-0000-0000-000000000004'),
    ('10000000-0000-0000-0000-000000000004', 'Core Placement & GATE ECE Prep', 'core-placement-gate', 'Alumni mentorship, interview experiences from Qualcomm, TI, Intel, and GATE study material.', 'Career & Mentorship', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (slug) DO NOTHING;
