# 🧪 Testing & Quality Assurance Plan

## 1. Automated Testing Strategy

The platform maintains testing coverage across three layers:
1. **Database & RLS Authorization Tests**: Automated verification that unauthenticated and unauthorized requests cannot read or write private data.
2. **API & Contract Tests**: Checking REST endpoints, JWT authentication, and pagination.
3. **Cross-Platform Synchronization Tests**: Verifying that actions performed on Web reflect on Mobile and vice-versa.

## 2. Cross-Platform Integration Verification Matrix

| Test Scenario | Action Performed | Expected Cross-Platform State |
| :--- | :--- | :--- |
| **1. Mobile Post Creation** | Student creates post on Flutter app with `#VLSI` tag | Post immediately visible on Web Home Feed with author metadata and tags |
| **2. Web Post Creation** | Faculty posts announcement on Web | Post immediately appears in Mobile feed |
| **3. Reaction Sync** | Student likes post on Web | Like counter increments on Mobile; duplicate likes prevented |
| **4. Direct Messaging** | User A sends chat message on Mobile to User B | User B receives message on Web chat thread with zero data leak to User C |
| **5. Private Document Protection** | Student uploads resume | Only student and hiring alumnus/faculty can access download URL |
| **6. Role Escalation Prevention**| Student attempts to pass `role: 'admin'` in payload | Backend RLS & validation rejects payload; role remains `student` |

## 3. Load Testing Specification (k6)

Target load testing schedule:
- 25 concurrent virtual users (baseline)
- 50 concurrent virtual users
- 100 concurrent virtual users
- 150 concurrent virtual users
- 200 concurrent virtual users (peak capacity target)

Metrics monitored:
- Response latency (p50 < 150ms, p95 < 450ms)
- HTTP error rate (< 0.5%)
- Peak Realtime connection ceiling (< 180 connections)
