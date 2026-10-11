# ⚙️ Operations, Monitoring & Disaster Recovery

## 1. Operational Health Checks
- **Frontend Health**: Monitor HTTP status and response times via Vercel Analytics or uptime monitor (e.g. UptimeRobot Free).
- **Backend / DB Health**: Monitor Supabase Dashboard for database pool utilization, connection spikes, and disk usage.
- **WebSocket / Realtime Health**: Monitor active concurrent channels against the 200 free tier limit.

## 2. Quota Management & Degraded Mode
- When realtime connection limits are approached (>170 connections):
  - Inactive tabs disconnect presence channels automatically.
  - Feeds fall back to HTTP pagination rather than WebSocket subscriptions.
  - Chat rooms maintain WebSockets only while open on screen.

## 3. Incident Response & Recovery
1. **Accidental Bad Deploy**:
   - Revert Git commit on `master` branch.
   - Vercel instant rollback to previous successful deployment.
2. **Database Schema Recovery**:
   - Apply inverse migration or restore from latest SQL dump.
3. **Account Security Violation**:
   - Deactivate user account immediately via `profiles.is_active = FALSE`.
   - Revoke active JWT refresh tokens.
