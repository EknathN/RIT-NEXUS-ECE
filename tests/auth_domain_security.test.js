/**
 * Automated Test Suite for RIT ECE Mandatory College Email Domain & Security
 * Approved Domain: @ece.ritchennai.edu.in
 * 
 * Verifies:
 * 1. Approved domain acceptance and normalization
 * 2. Rejected domains (gmail.com, ritchennai.edu.in, ece.ritchennai.com, fakeece.ritchennai.edu.in, substring exploits)
 * 3. Unverified user access controls
 * 4. Unauthorized database access protection
 * 5. Administrator-only operations & privilege escalation prevention
 */

import { validateCollegeEmail, normalizeEmail, APPROVED_EMAIL_DOMAIN } from '../server/utils/domainValidator.js';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 RIT ECE AUTHENTICATION & DOMAIN SECURITY TEST SUITE');
  console.log(`🔒 Approved Domain Target: @${APPROVED_EMAIL_DOMAIN}`);
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 1: DOMAIN VALIDATOR UNIT TESTS
  // --------------------------------------------------------------------------
  console.log('--- TEST SUITE 1: EMAIL NORMALIZATION & DOMAIN VALIDATION ---');

  // Approved addresses
  const validCases = [
    'student@ece.ritchennai.edu.in',
    'name123@ece.ritchennai.edu.in',
    'STUDENT@ECE.RITCHENNAI.EDU.IN',
    '  kavitha.s@ece.ritchennai.edu.in  ',
    'first.last+tag@ece.ritchennai.edu.in',
  ];

  for (const email of validCases) {
    const res = validateCollegeEmail(email);
    assert(
      res.isValid && res.normalizedEmail.endsWith('@' + APPROVED_EMAIL_DOMAIN),
      `Accept approved address: ${email}`,
      `Normalized to: ${res.normalizedEmail}`
    );
  }

  // Rejected addresses
  const invalidCases = [
    { email: 'student@gmail.com', reason: 'commercial email' },
    { email: 'student@ritchennai.edu.in', reason: 'missing ece subdomain' },
    { email: 'student@ece.ritchennai.com', reason: 'wrong TLD (.com instead of .edu.in)' },
    { email: 'student@fakeece.ritchennai.edu.in', reason: 'spoofed subdomain prefix' },
    { email: 'student@ece.ritchennai.edu.in.attacker.com', reason: 'subdomain spoofing' },
    { email: 'attacker@evil.com#ece.ritchennai.edu.in', reason: 'malformed url fragment' },
    { email: 'invalid-email', reason: 'missing domain' },
    { email: '', reason: 'empty email' },
    { email: '@ece.ritchennai.edu.in', reason: 'missing username' },
  ];

  for (const { email, reason } of invalidCases) {
    const res = validateCollegeEmail(email);
    assert(!res.isValid, `Reject unapproved address: '${email}'`, reason);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: BACKEND REGISTRATION DOMAIN ENFORCEMENT (INTEGRATION)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 2: BACKEND ENDPOINT DOMAIN RESTRICTIONS ---');

  // Attempt registration with student@gmail.com (MUST BE REJECTED)
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@gmail.com',
        password: 'password123',
        full_name: 'Test Gmail User',
        account_type: 'student',
      }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.error.includes(APPROVED_EMAIL_DOMAIN), 'Reject registration with student@gmail.com (HTTP 400)');
  } catch (err) {
    assert(false, 'Reject registration with student@gmail.com', err.message);
  }

  // Attempt registration with student@ritchennai.edu.in (MUST BE REJECTED)
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@ritchennai.edu.in',
        password: 'password123',
        full_name: 'Test General RIT User',
        account_type: 'student',
      }),
    });
    const data = await res.json();
    assert(res.status === 400, 'Reject registration with student@ritchennai.edu.in (HTTP 400)');
  } catch (err) {
    assert(false, 'Reject registration with student@ritchennai.edu.in', err.message);
  }

  // Attempt registration with student@fakeece.ritchennai.edu.in (MUST BE REJECTED)
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@fakeece.ritchennai.edu.in',
        password: 'password123',
        full_name: 'Fake ECE User',
        account_type: 'student',
      }),
    });
    const data = await res.json();
    assert(res.status === 400, 'Reject registration with student@fakeece.ritchennai.edu.in (HTTP 400)');
  } catch (err) {
    assert(false, 'Reject registration with student@fakeece.ritchennai.edu.in', err.message);
  }

  // Attempt registration with VALID @ece.ritchennai.edu.in address (MUST SUCCEED)
  const validTestEmail = `verify_${Date.now()}@ece.ritchennai.edu.in`;
  let studentToken = null;
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `  ${validTestEmail.toUpperCase()}  `, // Test case-insensitivity & whitespace normalization
        password: 'password123',
        full_name: 'Verified ECE Student',
        account_type: 'student',
        batch: '2026',
      }),
    });
    const data = await res.json();
    studentToken = data.token;
    assert(
      res.status === 201 && data.user.email === validTestEmail.toLowerCase(),
      `Accept registration with ${validTestEmail}`,
      'Normalized & Created HTTP 201'
    );
  } catch (err) {
    assert(false, `Accept registration with ${validTestEmail}`, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: UNAUTHORIZED DATABASE ACCESS & RLS ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 3: UNAUTHORIZED ACCESS & DATABASE PROTECTION ---');

  // 1. Unauthenticated request to protected endpoints
  try {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Unauthorized injection' }),
    });
    assert(res.status === 401, 'Block unauthenticated post creation (HTTP 401 Unauthorized)');
  } catch (err) {
    assert(false, 'Block unauthenticated post creation', err.message);
  }

  // 2. Unauthenticated request to /api/auth/me
  try {
    const res = await fetch(`${API_BASE}/auth/me`);
    assert(res.status === 401, 'Block unauthenticated profile fetch (HTTP 401)');
  } catch (err) {
    assert(false, 'Block unauthenticated profile fetch', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: ADMINISTRATOR-ONLY PRIVILEGES & ROLE ESCALATION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 4: PRIVILEGE ESCALATION & ADMIN-ONLY GATING ---');

  // 1. Normal student attempting to access admin analytics
  if (studentToken) {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert(res.status === 403, 'Forbid normal student from admin dashboard (/admin/analytics)', `Status: ${res.status}`);
    } catch (err) {
      assert(false, 'Forbid normal student from admin dashboard', err.message);
    }
  }

  // 2. Admin login with @ece.ritchennai.edu.in email
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@ece.ritchennai.edu.in',
        password: 'password123',
      }),
    });
    const data = await res.json();
    assert(
      res.status === 200 && data.user.role === 'admin',
      'Admin login with admin@ece.ritchennai.edu.in',
      `Role: ${data.user?.role}`
    );

    // Verify admin CAN access admin analytics
    const adminToken = data.token;
    const statsRes = await fetch(`${API_BASE}/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(statsRes.status === 200, 'Authorize admin to access /api/admin/analytics');
  } catch (err) {
    assert(false, 'Admin login with admin@ece.ritchennai.edu.in', err.message);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
