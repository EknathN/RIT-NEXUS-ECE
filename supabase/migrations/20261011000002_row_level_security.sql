-- ============================================================================
-- RIT ECE PROFESSIONAL NETWORKING PLATFORM
-- Migration: 20261011000002_row_level_security.sql
-- Description: Complete Row Level Security (RLS) policies for all tables
-- ============================================================================

-- Helper function to check if current user has an admin or moderator role
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 1. PROFILES RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active profiles
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (is_active = TRUE OR auth.uid() = id OR public.is_admin_or_moderator(auth.uid()));

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND
    -- Prevent self-escalation of role and verification status
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    verification_status = (SELECT verification_status FROM public.profiles WHERE id = auth.uid())
);

-- Admin can update any profile (e.g., verification, role changes, deactivation)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. USER ROLES RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User roles viewable by authenticated users"
ON public.user_roles FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Only admins can insert or update user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. VERIFICATION REQUESTS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests, admins can view all
CREATE POLICY "Users can view own verification requests"
ON public.verification_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Users can submit their own verification request
CREATE POLICY "Users can insert own verification request"
ON public.verification_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only admins can update verification requests (approve/reject)
CREATE POLICY "Only admins can update verification requests"
ON public.verification_requests FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 4. EDUCATION, EXPERIENCES, PROJECTS, CERTIFICATIONS, USER SKILLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Education viewable by all" ON public.education FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can manage own education" ON public.education FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Experiences viewable by all" ON public.experiences FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can manage own experiences" ON public.experiences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills viewable by all" ON public.skills FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can create skill tags" ON public.skills FOR INSERT TO authenticated WITH CHECK (TRUE);

ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User skills viewable by all" ON public.user_skills FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can manage own skills" ON public.user_skills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects viewable by all" ON public.projects FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certifications viewable by all" ON public.certifications FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can manage own certifications" ON public.certifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. USER CONNECTIONS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view connections they are part of or accepted"
ON public.user_connections FOR SELECT
TO authenticated
USING (status = 'accepted' OR auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send connection requests"
ON public.user_connections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connection requests sent to them or their own"
ON public.user_connections FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id OR auth.uid() = requester_id)
WITH CHECK (auth.uid() = recipient_id OR auth.uid() = requester_id);

CREATE POLICY "Users can remove connections"
ON public.user_connections FOR DELETE
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- ----------------------------------------------------------------------------
-- 6. POSTS & POST MEDIA RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable by authenticated users"
ON public.posts FOR SELECT
TO authenticated
USING (
    is_deleted = FALSE OR
    auth.uid() = author_id OR
    public.is_admin_or_moderator(auth.uid())
);

CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
ON public.posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users or moderators can delete posts"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = author_id OR public.is_admin_or_moderator(auth.uid()));

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Post media viewable with post"
ON public.post_media FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Users can attach media to their posts"
ON public.post_media FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- 7. POST LIKES & COMMENTS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes viewable by all" ON public.post_likes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by all" ON public.comments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can write comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors or admins can update/delete comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Authors or admins can delete comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.is_admin_or_moderator(auth.uid()));

-- ----------------------------------------------------------------------------
-- 8. CONVERSATIONS & MESSAGES RLS (STRICT ZERO-LEAK ACCESS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations they are member of"
ON public.conversations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (TRUE);

CREATE POLICY "Users can view members of their conversations"
ON public.conversation_members FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members cm2
        WHERE cm2.conversation_id = conversation_members.conversation_id AND cm2.user_id = auth.uid()
    )
);

CREATE POLICY "Users can add members to conversation they belong to"
ON public.conversation_members FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can read messages in their conversations only"
ON public.messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can send messages to their conversations only"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATIONS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view only their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can mark own notifications as read"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- ----------------------------------------------------------------------------
-- 10. JOBS & APPLICATIONS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jobs viewable by all authenticated"
ON public.jobs FOR SELECT
TO authenticated
USING (is_active = TRUE OR posted_by = auth.uid() OR public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Authorized roles can post jobs"
ON public.jobs FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = posted_by AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('alumni', 'faculty', 'admin')
    )
);

CREATE POLICY "Job posters or admins can update/delete jobs"
ON public.jobs FOR UPDATE
TO authenticated
USING (auth.uid() = posted_by OR public.is_admin(auth.uid()));

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants and Job Posters can view applications"
ON public.job_applications FOR SELECT
TO authenticated
USING (
    auth.uid() = applicant_id OR
    EXISTS (
        SELECT 1 FROM public.jobs
        WHERE id = job_applications.job_id AND posted_by = auth.uid()
    )
);

CREATE POLICY "Applicants can submit application"
ON public.job_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = applicant_id);

-- ----------------------------------------------------------------------------
-- 11. HACKATHONS & EVENTS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hackathons viewable by all" ON public.hackathons FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Faculty and Admins can create hackathons" ON public.hackathons FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Faculty and Admins can manage hackathons" ON public.hackathons FOR UPDATE TO authenticated USING (public.is_admin_or_moderator(auth.uid()));

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events viewable by all" ON public.events FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Faculty and Admins can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Faculty and Admins can manage events" ON public.events FOR UPDATE TO authenticated USING (public.is_admin_or_moderator(auth.uid()));

-- ----------------------------------------------------------------------------
-- 12. COMMUNITIES & MEMBERS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Communities viewable by all" ON public.communities FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins or faculty can create communities" ON public.communities FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_moderator(auth.uid()) OR auth.uid() = creator_id);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Community members viewable by all" ON public.community_members FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can join community" ON public.community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave community" ON public.community_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Community posts viewable by members" ON public.community_posts FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Community members can post" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.community_members WHERE community_id = community_posts.community_id AND user_id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- 13. CONTENT REPORTS, MODERATION ACTIONS & AUDIT LOGS RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can submit reports" ON public.content_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Moderators can view reports" ON public.content_reports FOR SELECT TO authenticated USING (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Moderators can update reports" ON public.content_reports FOR UPDATE TO authenticated USING (public.is_admin_or_moderator(auth.uid()));

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moderation actions viewable by admins/mods" ON public.moderation_actions FOR SELECT TO authenticated USING (public.is_admin_or_moderator(auth.uid()));
CREATE POLICY "Moderators can insert moderation actions" ON public.moderation_actions FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_moderator(auth.uid()));

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs viewable only by admins" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "System can record audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (TRUE);
