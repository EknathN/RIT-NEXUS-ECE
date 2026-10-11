# 🗄️ Database Architecture & Schema Documentation

## 1. Relational Schema Summary

The platform uses a normalized PostgreSQL relational database with 28 core tables, UUID primary keys, relational foreign keys with cascade constraints, and automated update triggers.

| Table Name | Description | Key Relationships |
| :--- | :--- | :--- |
| `profiles` | User profiles extending `auth.users` | 1-to-1 with Supabase Auth |
| `user_roles` | Role assignment (`student`, `alumni`, `faculty`, `admin`) | Many-to-1 with `profiles` |
| `verification_requests`| Student/alumni institutional ID proofs | Many-to-1 with `profiles` |
| `education` | Academic history | Many-to-1 with `profiles` |
| `experiences` | Internships and professional roles | Many-to-1 with `profiles` |
| `skills` / `user_skills` | Master skill library and user endorsements | Many-to-Many via join table |
| `projects` | Academic and personal hardware/software projects | Many-to-1 with `profiles` |
| `certifications` | Professional certifications (IEEE, Cisco, etc.) | Many-to-1 with `profiles` |
| `user_connections` | Peer connections (requester/recipient status) | Self-referencing `profiles` |
| `posts` | Department home feed posts | Many-to-1 with `profiles` |
| `post_media` | Media attachments for posts | Many-to-1 with `posts` |
| `post_likes` | Like reactions (unique constraint prevents dupes) | Join between `posts` and `profiles` |
| `comments` | Nested discussion comments | Self-referencing parent comments |
| `conversations` | 1-to-1 and group chat threads | Many-to-Many via members |
| `conversation_members` | Participants in chat threads | Join between threads and profiles |
| `messages` | Direct chat messages | Many-to-1 with `conversations` |
| `notifications` | In-app alerts | Many-to-1 with `profiles` |
| `jobs` | Job & internship postings | Many-to-1 with `profiles` (poster) |
| `job_applications` | Applications with resumes | Join between `jobs` and `profiles` |
| `hackathons` | Contests and incubation programs | Many-to-1 with `profiles` |
| `events` | Official department events and workshops | Many-to-1 with `profiles` |
| `communities` | Department technical circles | Many-to-1 with `profiles` |
| `community_members` | Membership in circles | Join between circles and profiles |
| `community_posts` | Discussions in technical circles | Many-to-1 with `communities` |
| `content_reports` | Moderation queue for flagged content | Many-to-1 with `profiles` |
| `moderation_actions` | Audit of admin moderator actions | Many-to-1 with `profiles` |
| `audit_logs` | Security audit trail for sensitive events | Many-to-1 with `profiles` |

## 2. Integrity Constraints & Business Logic

- **Prevent Self-Connections**: `CONSTRAINT chk_no_self_connect CHECK (requester_id <> recipient_id)`
- **Unique Connection Pairs**: `CONSTRAINT uq_connection_pair UNIQUE (requester_id, recipient_id)`
- **Idempotent Likes**: `CONSTRAINT uq_post_user_like UNIQUE (post_id, user_id)`
- **Unique Job Applications**: `CONSTRAINT uq_job_application UNIQUE (job_id, applicant_id)`
- **UTC Timestamps**: All timestamps strictly use `timezone('utc'::text, now())`.

## 3. Storage Buckets

1. `avatars`: Public read, authenticated write, 5 MB limit. Formats: JPEG, PNG, WebP.
2. `post_media`: Public read, authenticated write, 10 MB limit. Formats: JPEG, PNG, WebP, PDF.
3. `resumes`: Private read/write. Accessible only by applicant and authorized faculty/job poster. 10 MB limit.
4. `verification_docs`: Private read/write. Accessible only by the student and admin moderators. 5 MB limit.
