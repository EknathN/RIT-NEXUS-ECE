# 🏛️ RIT ECE Professional Networking Platform — System Architecture

## 1. Architectural Overview

The **RIT ECE Professional Networking Platform** connects students, alumni, faculty, and administrators of the Electronics and Communication Engineering Department at Rajalakshmi Institute of Technology (RIT), Chennai.

The platform employs a unified cross-platform architecture where both the **Web Client** and **Mobile Application (Flutter Android/iOS)** communicate with a shared backend.

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│         Web Application         │       │       Flutter Mobile App        │
│       (React 18 / Next.js)      │       │      (Android 1st / iOS)        │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 │          HTTPS / WSS / REST             │
                 └──────────────────┬──────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │              Shared Unified Backend Tier                │
       │                                                         │
       │   1. Direct Supabase Cloud (PostgreSQL + RLS + Auth)    │
       │   2. Express Edge Gateway (Rate Limiting + Audit Logs)   │
       └────────────────────────────┬────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ PostgreSQL 15+   │      │ Supabase Auth &  │      │ Supabase Realtime│
│  - 28 Tables     │      │ Storage Buckets  │      │  - Post updates  │
│  - Row Security  │      │  - avatars       │      │  - Chat messages │
│  - Constraints   │      │  - post_media    │      │  - Presence      │
│  - Triggers      │      │  - resumes       │      │  - Notifications │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

## 2. Core Pillars & Principles

1. **Single Source of Truth**: All data (posts, connections, chats, opportunities, profiles) resides in the shared PostgreSQL database. Mobile and Web see identical live data.
2. **Strict ₹0 Initial Operating Budget**: Built on Supabase Free Tier, Vercel/Render Hobby hosts, and open-source Flutter/React toolkits without paid APIs.
3. **Defense in Depth**: Authorization is enforced by PostgreSQL Row Level Security (RLS) policies at the database layer, secondary verification at API routes, and UI state protection.
4. **Resilient Offline & Degraded Modes**: Graceful fallback to cached queries when network drops; reconnection reconnects WebSockets without duplicating actions.

## 3. Web Architecture

- **Framework**: React 18 / Vite with component modularity.
- **Styling**: Vanilla CSS Design System with CSS custom properties (`--bg-primary`, `--accent-500`, `--cyan-500`, `--card-bg`), glassmorphism, responsive grid layouts, and dark/light mode toggle.
- **State & Context**: `AuthContext`, `ThemeContext`, `ToastContext`.
- **API Communication**: `src/services/api.js` and `src/services/supabaseClient.js`.

## 4. Mobile Architecture (Flutter)

- **Target**: Android (primary pilot APK), fully architected for iOS deployment.
- **Structure**:
  - `lib/models/`: Strongly-typed Dart data models (`User`, `Post`, `Job`, `Message`, `Community`).
  - `lib/services/`: Supabase integration, Auth provider, API client, local secure storage.
  - `lib/screens/`: Navigation targets (`FeedScreen`, `NetworkScreen`, `OpportunitiesScreen`, `MessagesScreen`, `ProfileScreen`, `LoginScreen`).
  - `lib/widgets/`: Reusable cards, dialogs, media uploaders, loading skeletons.
  - `lib/theme/`: RIT ECE cyber-navy (`#0A1128`) and neon-cyan (`#00E5FF`) palette matching the web platform.

## 5. Synchronization Strategy

- **Feed & Interactions**: Posts are created via direct database insert or REST endpoint. Web and Mobile clients listen to PostgreSQL change streams via Supabase Realtime for instant feed insertion.
- **Messaging**: Private chat rooms are scoped strictly to verified conversation members. Typing broadcasts use ephemeral Supabase Realtime Broadcast channels to prevent database bloat.
- **Presence**: Ephemeral presence tracking tracks active user tabs and mobile sessions without persistent database write churn.
