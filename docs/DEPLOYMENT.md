# 🚀 Deployment & Operations Guide

## 1. Prerequisites & Tooling
- Node.js 18+ and npm 9+
- Flutter SDK 3.19+ and Android Studio / Android SDK CLI
- Git version control
- Free Supabase Account ([supabase.com](https://supabase.com))

## 2. Supabase Setup (Shared Backend)

1. Create a new project on [supabase.com](https://supabase.com) named `rit-ece-platform`.
2. Navigate to **SQL Editor** in the Supabase Dashboard.
3. Execute the migrations sequentially:
   - `supabase/migrations/20261011000001_initial_schema.sql`
   - `supabase/migrations/20261011000002_row_level_security.sql`
   - `supabase/migrations/20261011000003_storage_buckets.sql`
   - `supabase/seed.sql` (to seed demo accounts and departmental circles)
4. Copy your **Project URL** and **anon public key** from `Settings > API`.

## 3. Web Deployment (Vercel / Node)

### Local Development:
```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or use local server mode)
npm install
npm run dev
```

### Vercel Hobby Deployment:
1. Push repository to GitHub.
2. Import project into Vercel.
3. Set build command: `npm run build` and output directory: `dist`.
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

## 4. Mobile Deployment (Flutter Android APK)

1. Navigate to the mobile directory:
   ```bash
   cd apps/mobile
   flutter pub get
   ```
2. Build Android release APK:
   ```bash
   flutter build apk --release
   ```
3. Locate APK at `build/app/outputs/flutter-apk/app-release.apk` for departmental sideloading or internal distribution.

## 5. Backup & Recovery

- **PostgreSQL Database**:
  - Export regular SQL dumps via `pg_dump`:
    ```bash
    pg_dump -h db.<ref>.supabase.co -U postgres -d postgres > backup_$(date +%F).sql
    ```
- **Storage Files**: Use Supabase storage CLI or S3-compatible script to sync `avatars` and `resumes` buckets to local cold storage.
