# 💰 Free-Tier Capacity, Quotas & Cost Strategy (₹0/Month Budget)

## 1. Zero-Cost Infrastructure Baseline

The platform is designed to operate sustainably within eligible free tiers:

| Component | Provider & Plan | Allocated Quota | Platform Design Strategy |
| :--- | :--- | :--- | :--- |
| **Relational Database** | Supabase Free | 500 MB Postgres storage | Efficient relational indexing; JSON media paths instead of base64 blobs. |
| **Object Storage** | Supabase Free | 1 GB storage | Client-side compression; 5 MB avatar limit, 10 MB media limit. |
| **Egress Bandwidth** | Supabase Free | 5 GB monthly egress | Cached static assets, lazy-loading of feed images, CDN thumbnailing. |
| **Realtime Connections**| Supabase Free | 200 peak connections | Scoped subscriptions: users only subscribe to active open chats and personal notifications. Feed uses query pagination. |
| **Realtime Messages** | Supabase Free | 2 Million messages/month | Transient broadcast channels for typing indicators and presence, avoiding DB writes. |
| **Monthly Active Users**| Supabase Free | 50,000 MAU | Well within initial RIT ECE design target (10,000 accounts, ~200 concurrent). |
| **Web Hosting** | Vercel Hobby / Render Free | 100 GB bandwidth / 750 free hrs | Edge static asset distribution, ISR for public profiles and job listings. |

## 2. Resource Consumption Estimation for 200 Concurrent Users

- **Target Capacity**: ~200 concurrent users at peak campus events (e.g., symposiums, placement season).
- **Persistent Realtime Target**: 120–150 persistent connections.
- **Connection Conservation**:
  - Passive feed browsing does NOT maintain an open Realtime channel. It loads posts via REST/Postgres query.
  - Active Realtime channels are only attached when a user actively opens `/messages` or requests live notification streaming.
  - In degraded or quota exhaustion scenarios, the client automatically falls back to polling or standard page revalidation without crashing.

## 3. Official Documentation & Pricing Links

- Supabase Pricing: [https://supabase.com/pricing](https://supabase.com/pricing)
- Vercel Pricing: [https://vercel.com/pricing](https://vercel.com/pricing)
- PostgreSQL Documentation: [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)

## 4. Conditions Under Which Free Tier May Become Insufficient

1. **Database Storage Exceeding 500 MB**: If post history and comments exceed 500 MB (projected after ~50,000 detailed posts with comments), archiving older academic batches (>4 years old) or upgrading to Supabase Pro ($25/mo) will be required.
2. **Storage Exceeding 1 GB**: If student photo and resume uploads exceed 1 GB (~1,000 resumes and 2,000 photos), cloud backup or cold archival to free Google Drive/S3 storage is recommended.
3. **Bandwidth Exceeding 5 GB**: High traffic on uncompressed multimedia posts. Addressed by aggressive WebP image compression before upload.
