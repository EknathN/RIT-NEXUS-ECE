# 🛡️ Security, Privacy & Access Control Architecture

## 1. Zero Trust Database Access with PostgreSQL Row Level Security (RLS)

Every table in the database has RLS enforced:

```sql
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- and all 26 other tables
```

### Critical Security Policies:
1. **Private Messaging Isolation**: Users can ONLY select or insert messages into conversations where their authenticated ID (`auth.uid()`) is an active member in `conversation_members`.
2. **Role Elevation Prevention**: The `profiles` update policy strictly verifies that users cannot alter their own `role` or `verification_status`:
   ```sql
   role = (SELECT role FROM public.profiles WHERE id = auth.uid())
   ```
   Admin roles can only be granted by existing administrators through the protected `user_roles` table.
3. **Private Document Protection**: Resumes and ID cards are stored in private storage buckets (`resumes`, `verification_docs`). RLS storage policies verify applicant ownership or administrative reviewer authorization.

## 2. Authentication & Credential Management

- Real authentication is managed via Supabase Auth (or JWT with bcrypt on local Express server).
- **No Secret Key Exposure**: Client bundles (both Next.js/Vite and Flutter) strictly only contain the public Anon / Publishable keys (`SUPABASE_ANON_KEY`). The Service Role key (`SUPABASE_SERVICE_ROLE_KEY`) is stored exclusively in server environment files and never bundled with browser or mobile APK binaries.

## 3. Abuse Controls & Rate Limiting

- **Rate Limiting**: Express middleware uses `express-rate-limit` to restrict brute-force attempts on authentication and posting routes.
- **File Validation**: Strict MIME-type checking (magic bytes and headers) plus max file size limits (5 MB avatars, 10 MB media).
- **Sanitization**: All user text inputs are stripped of executable script tags before rendering to prevent Cross-Site Scripting (XSS).

## 4. Privacy & Compliance

- **No Government IDs**: The platform exclusively uses institutional roll numbers and college ID cards for verification. No Aadhaar, PAN, or personal sensitive data is gathered.
- **Account Deletion / Deactivation**: Users can deactivate their account; all associated personal identifiers are disassociated or removed upon request.
