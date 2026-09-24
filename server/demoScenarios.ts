import {
  AnalysisRun,
  NormalizedFinding,
  PullRequestMetadata,
  BlastRadiusAnalysis,
} from '../src/types';
import { calculateReleaseRisk, determineTop3MustFix, calculateFindingRisk, calculateExpectedReduction } from './riskEngine';

export interface DemoScenario {
  id: string;
  name: string;
  tagline: string;
  category: string;
  expectedRiskLevel: string;
  metadata: PullRequestMetadata;
  rawFindings: NormalizedFinding[];
  blastRadius: BlastRadiusAnalysis;
}

// -------------------------------------------------------------
// DEMO 1: SQL Injection in Payment Processing
// -------------------------------------------------------------
const demo1Metadata: PullRequestMetadata = {
  id: 'demo-1-sql-injection',
  repository: 'acme-corp/payment-service',
  pr_number: 142,
  title: 'feat: Add customer payment profile lookup by user filter',
  author: 'dev-alex',
  author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces',
  branch: 'feature/payment-profile-filter',
  base_branch: 'main',
  created_at: '2026-09-24T02:15:00Z',
  files_changed: 4,
  lines_added: 88,
  lines_deleted: 14,
  description: 'Implements dynamic customer payment profile lookups for merchant checkout. Adds user_id filter querying postgresql.',
  files: [
    {
      filename: 'services/payment.py',
      status: 'modified',
      additions: 42,
      deletions: 8,
      patch: `@@ -35,8 +35,16 @@ def fetch_customer_payment_profile(user_id: str, tenant_id: str):
     cursor = db.get_cursor()
-    query = "SELECT * FROM payment_profiles WHERE tenant_id = %s"
-    cursor.execute(query, (tenant_id,))
+    # Dynamically query profile by user input
+    query = f"SELECT * FROM payment_profiles WHERE tenant_id = '{tenant_id}' AND user_id = '{user_id}'"
+    cursor.execute(query)
+    result = cursor.fetchall()
+    return result`,
      content_before: `import logging
from database import db
logger = logging.getLogger("payment")

def fetch_customer_payment_profile(user_id: str, tenant_id: str):
    cursor = db.get_cursor()
    query = "SELECT * FROM payment_profiles WHERE tenant_id = %s"
    cursor.execute(query, (tenant_id,))
    return cursor.fetchall()`,
      content_after: `import logging
from database import db
logger = logging.getLogger("payment")

def fetch_customer_payment_profile(user_id: str, tenant_id: str):
    cursor = db.get_cursor()
    # Dynamically query profile by user input
    query = f"SELECT * FROM payment_profiles WHERE tenant_id = '{tenant_id}' AND user_id = '{user_id}'"
    cursor.execute(query)
    result = cursor.fetchall()
    return result`,
    },
    {
      filename: 'tests/test_payment_mock.py',
      status: 'modified',
      additions: 24,
      deletions: 2,
      patch: `@@ -12,2 +12,6 @@ def test_fetch_profile():
+    mock_cursor = Mock()
+    mock_cursor.execute("SELECT * FROM dummy")
+    assert mock_cursor is not None`,
    },
    {
      filename: 'routes/checkout.py',
      status: 'modified',
      additions: 18,
      deletions: 4,
      patch: `@@ -80,4 +80,8 @@ def handle_checkout():
+    user_id = request.args.get("user_id")
+    profile = fetch_customer_payment_profile(user_id, request.tenant_id)
+    return jsonify(profile)`,
    },
  ],
};

const demo1BlastRadius: BlastRadiusAnalysis = {
  files_affected: 4,
  functions_affected: 7,
  modules_affected: 3,
  api_endpoints: 2,
  db_paths: 1,
  level: 'HIGH',
  detected_elements: [
    'services/payment.py (Payment Gateway Gateway Module)',
    'routes/checkout.py (Public Checkout HTTP Endpoint: POST /api/checkout)',
    'database/postgres.py (Production DB Connection Pool)',
    'tests/test_payment_mock.py',
  ],
};

const demo1Findings: NormalizedFinding[] = [
  {
    id: 'find-d1-01',
    category: 'SECURITY',
    type: 'SQL_INJECTION',
    severity: 'HIGH',
    certainty: 'HIGH_CONFIDENCE',
    confidence: 0.94,
    file: 'services/payment.py',
    line_start: 42,
    line_end: 42,
    title: 'SQL Injection via unparameterized f-string query in payment profile lookup',
    source: 'semgrep',
    rule_id: 'python.lang.security.audit.raw-sql-format',
    raw_message: 'Untrusted user input formatted directly into SQL statement via f-string',
    evidence: `Line 42: query = f"SELECT * FROM payment_profiles WHERE tenant_id = '{tenant_id}' AND user_id = '{user_id}'"
Sink: cursor.execute(query) at Line 43
Dataflow Origin: request.args.get("user_id") in routes/checkout.py:81
Path: Unsanitized user string passed directly to database cursor.`,
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'DATABASE',
      crosses_auth_boundary: 'YES',
    },
    explanation: 'User-controlled query parameter user_id from the public checkout route reaches PostgreSQL cursor.execute() without parameterized binding, allowing SQL injection and unauthorized data exfiltration or table tampering.',
    impact: 'Critical data breach: An unauthenticated or low-privilege attacker can bypass tenant isolation and dump the payment_profiles table or execute arbitrary SQL commands.',
    suggested_fix: 'Use parameterized query placeholders (%s) and pass parameters as a tuple to cursor.execute().',
    original_code: `    # Dynamically query profile by user input
    query = f"SELECT * FROM payment_profiles WHERE tenant_id = '{tenant_id}' AND user_id = '{user_id}'"
    cursor.execute(query)`,
    fixed_code: `    # Secure parameterized query prevents SQL injection
    query = "SELECT * FROM payment_profiles WHERE tenant_id = %s AND user_id = %s"
    cursor.execute(query, (tenant_id, user_id))`,
    patch: `@@ -40,3 +40,3 @@
-    query = f"SELECT * FROM payment_profiles WHERE tenant_id = '{tenant_id}' AND user_id = '{user_id}'"
-    cursor.execute(query)
+    query = "SELECT * FROM payment_profiles WHERE tenant_id = %s AND user_id = %s"
+    cursor.execute(query, (tenant_id, user_id))`,
    fix_effort: 'LOW',
    risk_contribution: 22,
    expected_risk_reduction: 20,
    is_must_fix: true,
    why_prioritized: 'Ranked #1 Must-Fix: Direct SQL injection vulnerability on an internet-facing checkout endpoint with user-controlled input and direct database sink.',
    verification_result: {
      patch_applied: true,
      syntax_check: 'PASS',
      static_analysis: 'PASS',
      finding_resolved: 'RESOLVED',
      regression_check: 'PASS',
      tests_status: 'PASS',
      tests_output: 'pytest tests/test_payment_security.py: 4 passed in 0.18s (SQL parameterization verified)',
      overall_status: 'VERIFIED',
      details: 'Patch applies cleanly, python AST syntax valid, Semgrep rule python.lang.security.audit.raw-sql-format no longer triggers, parameter binding confirmed in test mock.',
      verified_at: '2026-09-24T02:16:30Z',
    },
    test_code: `def test_payment_profile_sql_injection_rejection():
    # Attempt SQL injection payload in user_id
    payload = "' OR '1'='1"
    res = fetch_customer_payment_profile(user_id=payload, tenant_id="tenant-99")
    # Must query strictly with literal parameter, returning 0 records for non-existent user
    assert len(res) == 0`,
    test_status: 'PASS',
  },
  {
    id: 'find-d1-02',
    category: 'BUG',
    type: 'MISSING_TENANT_AUTHORIZATION',
    severity: 'HIGH',
    certainty: 'LIKELY',
    confidence: 0.88,
    file: 'routes/checkout.py',
    line_start: 81,
    line_end: 83,
    title: 'Missing session verification on checkout user_id parameter (IDOR)',
    source: 'bandit',
    rule_id: 'B106:hardcoded_param_auth',
    raw_message: 'Untrusted user_id accepted directly from URL parameters without checking authenticated session ID',
    evidence: 'routes/checkout.py:81 accepts user_id from query parameters without verifying session["authenticated_user_id"] == user_id.',
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'AUTH',
      crosses_auth_boundary: 'YES',
    },
    explanation: 'Any authenticated user can supply another user’s user_id in the query string to access their payment profile (Insecure Direct Object Reference).',
    impact: 'Data leakage of other customers’ saved cards and billing records.',
    suggested_fix: 'Validate that the requested user_id matches the authenticated JWT or session user ID.',
    original_code: `    user_id = request.args.get("user_id")
    profile = fetch_customer_payment_profile(user_id, request.tenant_id)`,
    fixed_code: `    # Enforce session ownership to prevent IDOR
    user_id = request.session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    profile = fetch_customer_payment_profile(user_id, request.tenant_id)`,
    patch: `@@ -80,2 +80,5 @@
-    user_id = request.args.get("user_id")
+    user_id = request.session.get("user_id")
+    if not user_id:
+        return jsonify({"error": "Unauthorized"}), 401`,
    fix_effort: 'LOW',
    risk_contribution: 17,
    expected_risk_reduction: 16,
    is_must_fix: true,
    why_prioritized: 'Ranked #2 Must-Fix: IDOR authorization flaw allowing cross-tenant customer profile exfiltration.',
    verification_result: {
      patch_applied: true,
      syntax_check: 'PASS',
      static_analysis: 'PASS',
      finding_resolved: 'RESOLVED',
      regression_check: 'PASS',
      tests_status: 'PASS',
      tests_output: 'pytest tests/test_checkout_auth.py: 3 passed (IDOR check verified)',
      overall_status: 'VERIFIED',
      details: 'Session ID enforcement successfully validated.',
      verified_at: '2026-09-24T02:17:00Z',
    },
    test_code: `def test_checkout_rejects_mismatched_session():
    client.set_session(user_id="user-123")
    res = client.get("/api/checkout?user_id=user-456")
    # Response must only return authenticated user data
    assert res.json["user_id"] == "user-123"`,
    test_status: 'PASS',
  },
  {
    id: 'find-d1-03',
    category: 'PERFORMANCE',
    type: 'UNINDEXED_QUERY',
    severity: 'MEDIUM',
    certainty: 'HIGH_CONFIDENCE',
    confidence: 0.85,
    file: 'services/payment.py',
    line_start: 36,
    line_end: 44,
    title: 'Full table scan on payment_profiles without composite index on (tenant_id, user_id)',
    source: 'semgrep',
    rule_id: 'db.performance.unindexed-composite-where',
    raw_message: 'WHERE filter on tenant_id and user_id lacks matching index schema definition',
    evidence: 'Query filters by tenant_id and user_id, but database migration V12 only created index on (tenant_id, created_at).',
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'NO',
      production_reachable: 'YES',
      sensitive_sink: 'DATABASE',
      crosses_auth_boundary: 'NO',
    },
    explanation: 'As the payment_profiles table grows past 100k rows, sequential scans will increase query latency to >1.5 seconds per checkout request.',
    impact: 'Checkout page slowdown and database connection pool exhaustion under traffic spikes.',
    suggested_fix: 'Create a composite index: CREATE INDEX idx_payment_profiles_tenant_user ON payment_profiles(tenant_id, user_id);',
    original_code: `-- Missing index for (tenant_id, user_id)`,
    fixed_code: `CREATE INDEX CONCURRENTLY idx_payment_profiles_tenant_user ON payment_profiles (tenant_id, user_id);`,
    patch: `+ CREATE INDEX CONCURRENTLY idx_payment_profiles_tenant_user ON payment_profiles (tenant_id, user_id);`,
    fix_effort: 'MEDIUM',
    risk_contribution: 9,
    expected_risk_reduction: 8,
    is_must_fix: true,
    why_prioritized: 'Ranked #3 Must-Fix: Prevents database thread starvation during peak checkout volume.',
    verification_result: {
      patch_applied: true,
      syntax_check: 'PASS',
      static_analysis: 'PASS',
      finding_resolved: 'RESOLVED',
      regression_check: 'PASS',
      tests_status: 'PASS',
      tests_output: 'explain analyze select * from payment_profiles: Index Scan using idx_payment_profiles_tenant_user (cost=0.28..8.30)',
      overall_status: 'VERIFIED',
      details: 'Migration script generated and verified with Postgres query planner.',
      verified_at: '2026-09-24T02:17:15Z',
    },
  },
  // FALSE POSITIVE SHIELD FINDINGS (Shielded from Actionable List)
  {
    id: 'find-d1-fp-01',
    category: 'SECURITY',
    type: 'RAW_SQL_STRING',
    severity: 'MEDIUM',
    certainty: 'STYLE_ONLY',
    confidence: 0.91,
    file: 'tests/test_payment_mock.py',
    line_start: 14,
    line_end: 14,
    title: 'Raw SQL string detected in test suite mock execution',
    source: 'bandit',
    rule_id: 'B608:hardcoded_sql_expressions',
    raw_message: 'Possible SQL injection vector via hardcoded SQL string in test file',
    evidence: 'mock_cursor.execute("SELECT * FROM dummy") in tests/test_payment_mock.py:14',
    status: 'FALSE_POSITIVE',
    fp_reason: 'Contextual AI Shield: Test suite mock file (tests/test_payment_mock.py). Input is a hardcoded test string in an isolated mock object, completely unreachable from production execution.',
    reachability: {
      internet_facing: 'NO',
      user_controlled: 'NO',
      production_reachable: 'NO',
      sensitive_sink: 'NONE',
      crosses_auth_boundary: 'NO',
    },
    explanation: 'Static analyzer triggered on execute("SELECT...") pattern, but file is located under tests/ and mocks database behavior with no network socket or production data connection.',
    impact: 'None. Safe test artifact.',
    suggested_fix: 'No change needed. Shielded from release-risk scoring.',
    fix_effort: 'LOW',
    risk_contribution: 0,
    expected_risk_reduction: 0,
    is_must_fix: false,
  },
  {
    id: 'find-d1-fp-02',
    category: 'STYLE',
    type: 'UNUSED_IMPORT',
    severity: 'LOW',
    certainty: 'STYLE_ONLY',
    confidence: 0.96,
    file: 'services/payment.py',
    line_start: 1,
    line_end: 1,
    title: 'Standard logger import flagged by linter',
    source: 'ruff',
    rule_id: 'F401:unused_import',
    raw_message: 'Module imported but unused',
    evidence: 'services/payment.py:1 import logging',
    status: 'FALSE_POSITIVE',
    fp_reason: 'Contextual AI Shield: Module-level logger is utilized by decorator in subsequent commits. Zero functional or security impact on release.',
    reachability: {
      internet_facing: 'NO',
      user_controlled: 'NO',
      production_reachable: 'YES',
      sensitive_sink: 'NONE',
      crosses_auth_boundary: 'NO',
    },
    explanation: 'Minor lint style warning with no bearing on stability or security.',
    impact: 'None.',
    suggested_fix: 'Use ruff autofix or keep for logging integration.',
    fix_effort: 'LOW',
    risk_contribution: 0,
    expected_risk_reduction: 0,
    is_must_fix: false,
  },
];

// -------------------------------------------------------------
// DEMO 2: Broken Authentication & Algorithm Confusion in JWT
// -------------------------------------------------------------
const demo2Metadata: PullRequestMetadata = {
  id: 'demo-2-auth-bypass',
  repository: 'cloud-native/auth-gateway',
  pr_number: 89,
  title: 'fix(auth): Support asymmetric RS256 and legacy HS256 tokens in single validator',
  author: 'sarah-crypto',
  author_avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=96&h=96&fit=crop&crop=faces',
  branch: 'fix/jwt-dual-algorithm',
  base_branch: 'main',
  created_at: '2026-09-24T01:40:00Z',
  files_changed: 3,
  lines_added: 65,
  lines_deleted: 19,
  description: 'Refactors JWT token verification to parse token header alg directly without hardcoded algorithm whitelist.',
  files: [
    {
      filename: 'src/middleware/jwtValidator.ts',
      status: 'modified',
      additions: 38,
      deletions: 11,
      patch: `@@ -22,11 +22,18 @@ export function verifyToken(token: string, publicKey: string) {
-  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
+  const decodedHeader = jwt.decode(token, { complete: true })?.header;
+  // Accept algorithm declared in header without strict whitelist
+  const alg = decodedHeader?.alg || 'none';
+  if (alg === 'none') {
+    return jwt.decode(token); // Bypass signature verification
+  }
+  return jwt.verify(token, publicKey, { algorithms: [alg] });`,
    },
  ],
};

const demo2BlastRadius: BlastRadiusAnalysis = {
  files_affected: 3,
  functions_affected: 5,
  modules_affected: 2,
  api_endpoints: 12,
  db_paths: 0,
  level: 'CRITICAL',
  detected_elements: [
    'src/middleware/jwtValidator.ts (Root Auth Middleware guarding 12 public routes)',
    'src/routes/user.ts',
    'src/routes/admin.ts',
  ],
};

const demo2Findings: NormalizedFinding[] = [
  {
    id: 'find-d2-01',
    category: 'SECURITY',
    type: 'JWT_ALGORITHM_CONFUSION_BYPASS',
    severity: 'CRITICAL',
    certainty: 'CONFIRMED',
    confidence: 0.98,
    file: 'src/middleware/jwtValidator.ts',
    line_start: 24,
    line_end: 29,
    title: 'Critical JWT Authentication Bypass via "alg: none" and dynamic algorithm acceptance',
    source: 'semgrep',
    rule_id: 'javascript.jwt.security.jwt-none-algorithm-accepted',
    raw_message: 'JWT verification dynamically trusts header alg property and explicitly permits "none" algorithm',
    evidence: `src/middleware/jwtValidator.ts:25:
if (alg === 'none') {
  return jwt.decode(token); // Bypasses cryptographic signature check completely
}`,
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'AUTH',
      crosses_auth_boundary: 'YES',
    },
    explanation: 'The code trusts the client-controlled alg header. An attacker crafting a token with {"alg": "none"} can impersonate any administrator or tenant without knowing the cryptographic secret.',
    impact: 'Full authentication bypass across all 12 protected API endpoints, allowing complete takeover of administrative accounts.',
    suggested_fix: 'Enforce strict algorithm whitelist ({ algorithms: ["RS256"] }) and reject "none" algorithm unconditionally.',
    original_code: `  const alg = decodedHeader?.alg || 'none';
  if (alg === 'none') {
    return jwt.decode(token);
  }
  return jwt.verify(token, publicKey, { algorithms: [alg] });`,
    fixed_code: `  // Strictly enforce cryptographic signature using RS256 only
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
  });`,
    patch: `@@ -24,6 +24,3 @@
-  const alg = decodedHeader?.alg || 'none';
-  if (alg === 'none') {
-    return jwt.decode(token);
-  }
-  return jwt.verify(token, publicKey, { algorithms: [alg] });
+  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });`,
    fix_effort: 'LOW',
    risk_contribution: 35,
    expected_risk_reduction: 34,
    is_must_fix: true,
    why_prioritized: 'Ranked #1 Must-Fix: Critical authentication bypass enabling trivial privilege escalation and impersonation.',
    verification_result: {
      patch_applied: true,
      syntax_check: 'PASS',
      static_analysis: 'PASS',
      finding_resolved: 'RESOLVED',
      regression_check: 'PASS',
      tests_status: 'PASS',
      tests_output: 'npm test -- jwtValidator.test.ts: 6 passed (none algorithm rejected with 401)',
      overall_status: 'VERIFIED',
      details: 'Strict RS256 algorithm enforcement verified against token forge test suite.',
      verified_at: '2026-09-24T01:45:00Z',
    },
    test_code: `it('rejects forged token with alg: none', () => {
  const forgedToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiJ9.';
  expect(() => verifyToken(forgedToken, pubKey)).toThrow('jwt signature required');
});`,
    test_status: 'PASS',
  },
  {
    id: 'find-d2-02',
    category: 'SECURITY',
    type: 'TIMING_ATTACK',
    severity: 'MEDIUM',
    certainty: 'LIKELY',
    confidence: 0.86,
    file: 'src/middleware/jwtValidator.ts',
    line_start: 35,
    line_end: 35,
    title: 'Non-constant-time comparison on HMAC signature comparison',
    source: 'eslint',
    rule_id: 'security/detect-possible-timing-attacks',
    raw_message: 'String comparison operator (===) used to compare cryptographic hash',
    evidence: 'Line 35: computedSignature === providedSignature',
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'AUTH',
      crosses_auth_boundary: 'YES',
    },
    explanation: 'Using === leaks character matching duration through timing differences.',
    impact: 'Potential signature recovery through statistical latency measurement.',
    suggested_fix: 'Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)).',
    fix_effort: 'LOW',
    risk_contribution: 8,
    expected_risk_reduction: 8,
    is_must_fix: true,
  },
  {
    id: 'find-d2-fp-01',
    category: 'CODE_SMELL',
    type: 'INLINE_CONSOLE_LOG',
    severity: 'LOW',
    certainty: 'STYLE_ONLY',
    confidence: 0.95,
    file: 'src/middleware/jwtValidator.ts',
    line_start: 12,
    line_end: 12,
    title: 'Linter warning on debug logger invocation',
    source: 'eslint',
    rule_id: 'no-console',
    raw_message: 'Unexpected console statement',
    evidence: 'console.debug("Validating token signature")',
    status: 'FALSE_POSITIVE',
    fp_reason: 'Contextual AI Shield: Strip-debug plugin strips console.debug in production build pipeline.',
    reachability: {
      internet_facing: 'NO',
      user_controlled: 'NO',
      production_reachable: 'NO',
      sensitive_sink: 'NONE',
      crosses_auth_boundary: 'NO',
    },
    explanation: 'Debug log statement compiled out in target bundle.',
    impact: 'None.',
    suggested_fix: 'Ignore.',
    fix_effort: 'LOW',
    risk_contribution: 0,
    expected_risk_reduction: 0,
    is_must_fix: false,
  },
];

// -------------------------------------------------------------
// DEMO 3: Performance Inefficiency (N+1 Synchronous Query)
// -------------------------------------------------------------
const demo3Metadata: PullRequestMetadata = {
  id: 'demo-3-n-plus-1-perf',
  repository: 'enterprise/analytics-service',
  pr_number: 304,
  title: 'perf(reports): Generate department billing breakdown report',
  author: 'dev-marcus',
  author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces',
  branch: 'feat/department-report',
  base_branch: 'main',
  created_at: '2026-09-24T00:50:00Z',
  files_changed: 2,
  lines_added: 52,
  lines_deleted: 6,
  description: 'Adds synchronous monthly billing summary calculation across all organizational departments.',
  files: [
    {
      filename: 'reports/generator.py',
      status: 'modified',
      additions: 44,
      deletions: 4,
      patch: `@@ -15,4 +15,14 @@ def generate_org_report(org_id: str):
+    departments = db.query("SELECT id FROM departments WHERE org_id = %s", (org_id,))
+    report = []
+    for dept in departments:
+        # N+1 query executed inside loop for each department
+        invoices = db.query("SELECT sum(amount) FROM invoices WHERE dept_id = %s", (dept['id'],))
+        users = db.query("SELECT count(*) FROM users WHERE dept_id = %s", (dept['id'],))
+        report.append({"dept": dept['id'], "total": invoices[0][0], "users": users[0][0]})
+    return report`,
    },
  ],
};

const demo3BlastRadius: BlastRadiusAnalysis = {
  files_affected: 2,
  functions_affected: 4,
  modules_affected: 1,
  api_endpoints: 1,
  db_paths: 2,
  level: 'HIGH',
  detected_elements: [
    'reports/generator.py (Synchronous Reporting Worker)',
    'api/v1/analytics/reports.py (GET /api/v1/analytics/org-report)',
  ],
};

const demo3Findings: NormalizedFinding[] = [
  {
    id: 'find-d3-01',
    category: 'PERFORMANCE',
    type: 'N_PLUS_ONE_QUERY_LOOP',
    severity: 'HIGH',
    certainty: 'HIGH_CONFIDENCE',
    confidence: 0.95,
    file: 'reports/generator.py',
    line_start: 18,
    line_end: 22,
    title: 'Severe N+1 database queries executed inside unbounded department loop',
    source: 'semgrep',
    rule_id: 'python.database.perf.n-plus-one-query-in-loop',
    raw_message: 'Database query executed inside iteration construct leads to exponential roundtrip overhead',
    evidence: `for dept in departments:
  invoices = db.query("SELECT sum(amount)...", (dept['id'],))
  users = db.query("SELECT count(*)...", (dept['id'],))`,
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'DATABASE',
      crosses_auth_boundary: 'NO',
    },
    explanation: 'For an enterprise organization with 500 departments, this loop executes 1,001 synchronous network queries to the database, exhausting the pool and causing HTTP 504 Gateway Timeouts.',
    impact: 'Denial of Service on shared database connection pool during billing report generation.',
    suggested_fix: 'Aggregate in a single JOIN query using GROUP BY dept_id.',
    original_code: `    for dept in departments:
        invoices = db.query("SELECT sum(amount) FROM invoices WHERE dept_id = %s", (dept['id'],))
        users = db.query("SELECT count(*) FROM users WHERE dept_id = %s", (dept['id'],))
        report.append({"dept": dept['id'], "total": invoices[0][0], "users": users[0][0]})`,
    fixed_code: `    # Single aggregated query executes in 1 roundtrip
    query = """
        SELECT d.id AS dept, COALESCE(SUM(i.amount), 0) AS total, COUNT(DISTINCT u.id) AS users
        FROM departments d
        LEFT JOIN invoices i ON d.id = i.dept_id
        LEFT JOIN users u ON d.id = u.dept_id
        WHERE d.org_id = %s
        GROUP BY d.id
    """
    return db.query_dict(query, (org_id,))`,
    patch: `@@ -17,5 +17,9 @@
-    for dept in departments:
-        invoices = db.query("SELECT sum(amount) FROM invoices WHERE dept_id = %s", (dept['id'],))
-        users = db.query("SELECT count(*) FROM users WHERE dept_id = %s", (dept['id'],))
-        report.append({"dept": dept['id'], "total": invoices[0][0], "users": users[0][0]})
+    query = "SELECT d.id, COALESCE(SUM(i.amount), 0), COUNT(DISTINCT u.id) FROM departments d LEFT JOIN invoices i ON d.id = i.dept_id LEFT JOIN users u ON d.id = u.dept_id WHERE d.org_id = %s GROUP BY d.id"
+    return db.query_dict(query, (org_id,))`,
    fix_effort: 'MEDIUM',
    risk_contribution: 21,
    expected_risk_reduction: 19,
    is_must_fix: true,
    why_prioritized: 'Ranked #1 Must-Fix: Resolves database pool exhaustion and reduces 1,000+ roundtrips to 1 query.',
    verification_result: {
      patch_applied: true,
      syntax_check: 'PASS',
      static_analysis: 'PASS',
      finding_resolved: 'RESOLVED',
      regression_check: 'PASS',
      tests_status: 'PASS',
      tests_output: 'Benchmark: Query execution reduced from 2,420ms (N+1) to 14ms (Single Aggregation)',
      overall_status: 'VERIFIED',
      details: 'Query plan validated, joins indexed properly.',
      verified_at: '2026-09-24T00:55:00Z',
    },
  },
  {
    id: 'find-d3-02',
    category: 'BUG',
    type: 'UNHANDLED_EMPTY_DATASET_NULL',
    severity: 'MEDIUM',
    certainty: 'CONFIRMED',
    confidence: 0.92,
    file: 'reports/generator.py',
    line_start: 22,
    line_end: 22,
    title: 'IndexError when department has zero invoices (invoices[0][0])',
    source: 'ruff',
    rule_id: 'ruff.index.unsafe_access',
    raw_message: 'Direct subscript access on query return value without checking length',
    evidence: 'invoices[0][0] raises IndexError or TypeError when SUM() returns NULL on empty tables',
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'NONE',
      crosses_auth_boundary: 'NO',
    },
    explanation: 'When a new department has no recorded invoices, database returns null/empty list, crashing the worker with HTTP 500.',
    impact: 'Report generation crashes for newly onboarded organizations.',
    suggested_fix: 'Handle None/NULL safely using COALESCE or default fallback.',
    fix_effort: 'LOW',
    risk_contribution: 14,
    expected_risk_reduction: 13,
    is_must_fix: true,
  },
];

// -------------------------------------------------------------
// DEMO 4: Null Handling / Functional Bug in Order Dispatch
// -------------------------------------------------------------
const demo4Metadata: PullRequestMetadata = {
  id: 'demo-4-null-dereference',
  repository: 'retail/order-fulfillment',
  pr_number: 512,
  title: 'feat: Process digital and physical hybrid gift order checkout',
  author: 'dev-chen',
  author_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=faces',
  branch: 'feat/hybrid-orders',
  base_branch: 'main',
  created_at: '2026-09-23T23:10:00Z',
  files_changed: 3,
  lines_added: 48,
  lines_deleted: 12,
  description: 'Expands order processor to accept digital gift certificates without requiring physical postal addresses.',
  files: [
    {
      filename: 'services/order_processor.ts',
      status: 'modified',
      additions: 32,
      deletions: 7,
      patch: `@@ -45,7 +45,12 @@ export async function dispatchOrder(order: OrderPayload) {
+  // Shipping address can be null for pure digital vouchers
+  const postalCode = order.shippingAddress.postalCode.toUpperCase();
+  const carrier = lookupCarrierByPostal(postalCode);
+  await chargeCard(order.paymentMethod, order.total);
+  await queueWarehouseShipment(order.id, carrier);`,
    },
  ],
};

const demo4BlastRadius: BlastRadiusAnalysis = {
  files_affected: 3,
  functions_affected: 6,
  modules_affected: 2,
  api_endpoints: 2,
  db_paths: 1,
  level: 'HIGH',
  detected_elements: [
    'services/order_processor.ts (Core Transaction Dispatcher)',
    'controllers/orderController.ts (POST /api/orders/checkout)',
    'models/order.ts',
  ],
};

const demo4Findings: NormalizedFinding[] = [
  {
    id: 'find-d4-01',
    category: 'BUG',
    type: 'NULL_POINTER_DEREFERENCE',
    severity: 'HIGH',
    certainty: 'CONFIRMED',
    confidence: 0.97,
    file: 'services/order_processor.ts',
    line_start: 46,
    line_end: 47,
    title: 'Uncaught TypeError: Cannot read property "postalCode" of null/undefined',
    source: 'eslint',
    rule_id: '@typescript-eslint/no-unsafe-member-access',
    raw_message: 'Unsafe member access on optional property shippingAddress',
    evidence: `services/order_processor.ts:46:
const postalCode = order.shippingAddress.postalCode.toUpperCase();
(order.shippingAddress is null for digital gift orders)`,
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'NONE',
      crosses_auth_boundary: 'NO',
    },
    explanation: 'Digital orders set shippingAddress to null. When dispatchOrder() runs, it immediately throws an unhandled TypeError, causing checkout transactions to abort with 500 Internal Server Error.',
    impact: 'Production outage for 100% of digital gift card purchases.',
    suggested_fix: 'Check if order.isDigital or order.shippingAddress exists before accessing postalCode.',
    original_code: `  const postalCode = order.shippingAddress.postalCode.toUpperCase();
  const carrier = lookupCarrierByPostal(postalCode);`,
    fixed_code: `  // Safely guard against null postalCode for digital orders
  if (!order.isDigital && order.shippingAddress?.postalCode) {
    const postalCode = order.shippingAddress.postalCode.toUpperCase();
    const carrier = lookupCarrierByPostal(postalCode);
    await queueWarehouseShipment(order.id, carrier);
  }`,
    patch: `@@ -46,3 +46,5 @@
-  const postalCode = order.shippingAddress.postalCode.toUpperCase();
-  const carrier = lookupCarrierByPostal(postalCode);
+  if (!order.isDigital && order.shippingAddress?.postalCode) {
+    const postalCode = order.shippingAddress.postalCode.toUpperCase();
+    const carrier = lookupCarrierByPostal(postalCode);
+    await queueWarehouseShipment(order.id, carrier);
+  }`,
    fix_effort: 'LOW',
    risk_contribution: 23,
    expected_risk_reduction: 21,
    is_must_fix: true,
    why_prioritized: 'Ranked #1 Must-Fix: Direct unhandled runtime exception causing 100% failure on digital checkouts.',
    verification_result: {
      patch_applied: true,
      syntax_check: 'PASS',
      static_analysis: 'PASS',
      finding_resolved: 'RESOLVED',
      regression_check: 'PASS',
      tests_status: 'PASS',
      tests_output: 'npm test -- order_processor.test.ts: 8 passed (digital order processed cleanly)',
      overall_status: 'VERIFIED',
      details: 'Optional chaining and digital order conditional branch passed all unit tests.',
      verified_at: '2026-09-23T23:15:00Z',
    },
    test_code: `it('processes digital order without shipping address without throwing', async () => {
  const digitalOrder = { id: 'ord-1', isDigital: true, shippingAddress: null, total: 50 };
  await expect(dispatchOrder(digitalOrder)).resolves.not.toThrow();
});`,
    test_status: 'PASS',
  },
  {
    id: 'find-d4-02',
    category: 'BUG',
    type: 'MISSING_IDEMPOTENCY_LOCK',
    severity: 'HIGH',
    certainty: 'LIKELY',
    confidence: 0.89,
    file: 'services/order_processor.ts',
    line_start: 48,
    line_end: 49,
    title: 'Double charging risk: chargeCard executes prior to queuing warehouse dispatch without lock',
    source: 'eslint',
    rule_id: 'custom-rules/idempotency-check',
    raw_message: 'External payment transaction executed without distributed idempotency key',
    evidence: 'chargeCard() called without idempotency key; if subsequent queueWarehouseShipment fails, customer is billed without order record.',
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'DATABASE',
      crosses_auth_boundary: 'YES',
    },
    explanation: 'Network glitches during shipment queuing cause customer retry, resulting in double-debiting user credit card.',
    impact: 'Financial discrepancies and chargeback penalties.',
    suggested_fix: 'Pass order.id as idempotency key to payment gateway.',
    fix_effort: 'LOW',
    risk_contribution: 18,
    expected_risk_reduction: 17,
    is_must_fix: true,
  },
];

// -------------------------------------------------------------
// DEMO 5: Mixed Security + Bugs + Vulnerable Dependency Risk
// -------------------------------------------------------------
const demo5Metadata: PullRequestMetadata = {
  id: 'demo-5-mixed-enterprise',
  repository: 'fintech-core/wallet-service',
  pr_number: 780,
  title: 'chore(deps): Upgrade core libraries & refactor promo discount redemption',
  author: 'dev-elena',
  author_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=faces',
  branch: 'upgrade/deps-and-discounts',
  base_branch: 'main',
  created_at: '2026-09-23T21:00:00Z',
  files_changed: 6,
  lines_added: 135,
  lines_deleted: 42,
  description: 'Bumps express and jsonwebtoken versions, and adds instant coupon code discount validation.',
  files: [
    {
      filename: 'package.json',
      status: 'modified',
      additions: 2,
      deletions: 2,
      patch: `@@ -18,2 +18,2 @@
-    "jsonwebtoken": "^9.0.0",
+    "jsonwebtoken": "8.5.1",`,
    },
    {
      filename: 'src/services/coupon.ts',
      status: 'modified',
      additions: 45,
      deletions: 8,
      patch: `@@ -20,6 +20,12 @@ export async function applyCoupon(code: string, cartTotal: number) {
+  const rawSql = "SELECT discount_pct FROM coupons WHERE code = '" + code + "'";
+  const row = await db.query(rawSql);
+  return cartTotal * (1 - row[0].discount_pct / 100);`,
    },
    {
      filename: 'src/routes/checkout.ts',
      status: 'modified',
      additions: 12,
      deletions: 3,
      patch: `@@ -45,3 +45,12 @@ router.post('/checkout/apply-promo', async (req, res) => {
+  const { promoCode, cartTotal } = req.body;
+  const finalAmount = await applyCoupon(promoCode, cartTotal);
+  res.json({ finalAmount });
+});`,
    },
  ],
};

const demo5BlastRadius: BlastRadiusAnalysis = {
  files_affected: 6,
  functions_affected: 11,
  modules_affected: 4,
  api_endpoints: 4,
  db_paths: 2,
  level: 'CRITICAL',
  detected_elements: [
    'package.json (Vulnerable Downgrade: jsonwebtoken@8.5.1 has CVE-2022-23529)',
    'src/services/coupon.ts (SQL injection in promo validation)',
    'src/routes/checkout.ts',
    'src/routes/wallet.ts',
  ],
  dependency_risk: [
    {
      package_name: 'jsonwebtoken',
      old_version: '^9.0.0',
      new_version: '8.5.1',
      direct: true,
      potential_impact: 'High: Downgrades to vulnerable version susceptible to CVE-2022-23529 (Remote Code Execution via crafted secretOrPublicKey)',
      evidence: 'package.json:19 reverted from patched 9.0.0 to vulnerable 8.5.1.',
    },
  ],
};

const demo5Findings: NormalizedFinding[] = [
  {
    id: 'find-d5-01',
    category: 'DEPENDENCY',
    type: 'VULNERABLE_DEPENDENCY_CVE',
    severity: 'CRITICAL',
    certainty: 'CONFIRMED',
    confidence: 0.99,
    file: 'package.json',
    line_start: 19,
    line_end: 19,
    title: 'Dependency Downgrade to Vulnerable jsonwebtoken@8.5.1 (CVE-2022-23529)',
    source: 'dependency_check',
    rule_id: 'CVE-2022-23529',
    raw_message: 'Known CVE in jsonwebtoken < 9.0.0 permits RCE through toString override in key validation',
    evidence: 'package.json line 19 downgrades jsonwebtoken from ^9.0.0 to 8.5.1.',
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'SHELL',
      crosses_auth_boundary: 'YES',
    },
    explanation: 'jsonwebtoken versions prior to 9.0.0 are vulnerable to Remote Code Execution via poisoned key objects passed into jwt.verify().',
    impact: 'Server compromise through Remote Code Execution.',
    suggested_fix: 'Keep jsonwebtoken pinned to ^9.0.2 or higher.',
    original_code: `    "jsonwebtoken": "8.5.1",`,
    fixed_code: `    "jsonwebtoken": "^9.0.2",`,
    patch: `@@ -19,1 +19,1 @@
-    "jsonwebtoken": "8.5.1",
+    "jsonwebtoken": "^9.0.2",`,
    fix_effort: 'LOW',
    risk_contribution: 28,
    expected_risk_reduction: 27,
    is_must_fix: true,
    why_prioritized: 'Ranked #1 Must-Fix: Critical CVE vulnerability introduced via accidental dependency downgrade.',
    verification_result: {
      patch_applied: true,
      syntax_check: 'PASS',
      static_analysis: 'PASS',
      finding_resolved: 'RESOLVED',
      regression_check: 'PASS',
      tests_status: 'PASS',
      tests_output: 'npm audit --json: 0 vulnerabilities found after pinning 9.0.2',
      overall_status: 'VERIFIED',
      details: 'Vulnerability scanner confirmed clean dependency graph.',
      verified_at: '2026-09-23T21:10:00Z',
    },
  },
  {
    id: 'find-d5-02',
    category: 'SECURITY',
    type: 'SQL_INJECTION',
    severity: 'HIGH',
    certainty: 'HIGH_CONFIDENCE',
    confidence: 0.95,
    file: 'src/services/coupon.ts',
    line_start: 21,
    line_end: 22,
    title: 'SQL Injection in promo coupon verification',
    source: 'eslint',
    rule_id: 'security/detect-sql-injection',
    raw_message: 'String concatenation inside raw SQL query',
    evidence: `src/services/coupon.ts:21: const rawSql = "SELECT discount_pct FROM coupons WHERE code = '" + code + "'";`,
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'DATABASE',
      crosses_auth_boundary: 'NO',
    },
    explanation: 'Coupon codes entered by anonymous users are concatenated directly into SQL.',
    impact: 'Coupon database exfiltration and checkout cart price manipulation.',
    suggested_fix: 'Use parameterized queries: db.query("SELECT discount_pct FROM coupons WHERE code = $1", [code]);',
    original_code: `  const rawSql = "SELECT discount_pct FROM coupons WHERE code = '" + code + "'";
  const row = await db.query(rawSql);`,
    fixed_code: `  const query = "SELECT discount_pct FROM coupons WHERE code = $1";
  const row = await db.query(query, [code]);`,
    patch: `@@ -21,2 +21,2 @@
-  const rawSql = "SELECT discount_pct FROM coupons WHERE code = '" + code + "'";
-  const row = await db.query(rawSql);
+  const query = "SELECT discount_pct FROM coupons WHERE code = $1";
+  const row = await db.query(query, [code]);`,
    fix_effort: 'LOW',
    risk_contribution: 22,
    expected_risk_reduction: 21,
    is_must_fix: true,
    why_prioritized: 'Ranked #2 Must-Fix: Direct SQL injection on checkout coupon input.',
    verification_result: {
      patch_applied: true,
      syntax_check: 'PASS',
      static_analysis: 'PASS',
      finding_resolved: 'RESOLVED',
      regression_check: 'PASS',
      tests_status: 'PASS',
      tests_output: 'jest coupon.test.ts: 5 passed (SQL payload safely escaped)',
      overall_status: 'VERIFIED',
      details: 'Parameterized SQL query verified.',
      verified_at: '2026-09-23T21:12:00Z',
    },
  },
  {
    id: 'find-d5-03',
    category: 'BUG',
    type: 'UNHANDLED_PROMISE_REJECTION',
    severity: 'MEDIUM',
    certainty: 'HIGH_CONFIDENCE',
    confidence: 0.9,
    file: 'src/services/coupon.ts',
    line_start: 23,
    line_end: 23,
    title: 'Unhandled error when invalid coupon code returns zero rows (row[0].discount_pct)',
    source: 'eslint',
    rule_id: '@typescript-eslint/no-unsafe-member-access',
    raw_message: 'Cannot read properties of undefined (reading discount_pct)',
    evidence: 'When user submits non-existent coupon, row is empty array and row[0] is undefined.',
    status: 'TRUE_POSITIVE',
    reachability: {
      internet_facing: 'YES',
      user_controlled: 'YES',
      production_reachable: 'YES',
      sensitive_sink: 'NONE',
      crosses_auth_boundary: 'NO',
    },
    explanation: 'Entering an expired or invalid coupon crashes the checkout flow with 500 instead of a friendly "Invalid Coupon" notice.',
    impact: 'Checkout page crashes on user coupon typo.',
    suggested_fix: 'Check if (!row || row.length === 0) return null;',
    fix_effort: 'LOW',
    risk_contribution: 12,
    expected_risk_reduction: 11,
    is_must_fix: true,
  },
];

export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  'demo-1': {
    id: 'demo-1',
    name: 'Demo 1 — SQL Injection in Payment Profile',
    tagline: 'acme-corp/payment-service • PR #142',
    category: 'Security Vulnerability',
    expectedRiskLevel: 'HIGH (78/100)',
    metadata: demo1Metadata,
    rawFindings: demo1Findings,
    blastRadius: demo1BlastRadius,
  },
  'demo-2': {
    id: 'demo-2',
    name: 'Demo 2 — Broken Auth & Token Signature Bypass',
    tagline: 'cloud-native/auth-gateway • PR #89',
    category: 'Authentication / Authorization',
    expectedRiskLevel: 'CRITICAL (84/100)',
    metadata: demo2Metadata,
    rawFindings: demo2Findings,
    blastRadius: demo2BlastRadius,
  },
  'demo-3': {
    id: 'demo-3',
    name: 'Demo 3 — Performance Inefficiency (N+1 Query Loop)',
    tagline: 'enterprise/analytics-service • PR #304',
    category: 'Performance & Scale',
    expectedRiskLevel: 'ELEVATED (58/100)',
    metadata: demo3Metadata,
    rawFindings: demo3Findings,
    blastRadius: demo3BlastRadius,
  },
  'demo-4': {
    id: 'demo-4',
    name: 'Demo 4 — Functional Bug & Null Dereference',
    tagline: 'retail/order-fulfillment • PR #512',
    category: 'Functional Reliability',
    expectedRiskLevel: 'HIGH (64/100)',
    metadata: demo4Metadata,
    rawFindings: demo4Findings,
    blastRadius: demo4BlastRadius,
  },
  'demo-5': {
    id: 'demo-5',
    name: 'Demo 5 — Multi-Tier Enterprise (Security + Bug + CVE)',
    tagline: 'fintech-core/wallet-service • PR #780',
    category: 'Enterprise Mixed Risk',
    expectedRiskLevel: 'CRITICAL (88/100)',
    metadata: demo5Metadata,
    rawFindings: demo5Findings,
    blastRadius: demo5BlastRadius,
  },
};

/**
 * Builds an AnalysisRun for a demo scenario, computing risk deterministically
 */
export function getDemoAnalysisRun(scenarioKey: string = 'demo-1'): AnalysisRun {
  const scenario = DEMO_SCENARIOS[scenarioKey] || DEMO_SCENARIOS['demo-1'];
  
  // Compute risk points for each finding
  const findingsWithRisk = scenario.rawFindings.map((f) => {
    const risk = calculateFindingRisk(f);
    const reduction = calculateExpectedReduction(f, risk);
    return {
      ...f,
      risk_contribution: f.risk_contribution || risk,
      expected_risk_reduction: f.expected_risk_reduction || reduction,
    };
  });

  const riskScore = calculateReleaseRisk(findingsWithRisk, scenario.blastRadius);
  const top3 = determineTop3MustFix(findingsWithRisk);

  const rawCount = findingsWithRisk.length;
  const fpCount = findingsWithRisk.filter((f) => f.status === 'FALSE_POSITIVE').length;
  const needsReviewCount = findingsWithRisk.filter((f) => f.status === 'NEEDS_HUMAN_REVIEW' || f.status === 'UNCERTAIN').length;
  const actionableCount = rawCount - fpCount;

  return {
    id: `analysis-${scenario.id}-${Date.now()}`,
    pr: scenario.metadata,
    created_at: new Date().toISOString(),
    mode: 'DEMO',
    ai_provider: 'Deterministic DemoProvider (Zero Paid API)',
    ai_model: 'offline-grounded-eval-v1',
    raw_findings_count: rawCount,
    actionable_findings_count: actionableCount,
    false_positives_count: fpCount,
    needs_review_count: needsReviewCount,
    findings: findingsWithRisk,
    top_3_must_fix: top3,
    risk: riskScore,
    blast_radius: scenario.blastRadius,
    tool_health: {
      semgrep: true,
      bandit: true,
      ruff: true,
      eslint: true,
      ollama: false, // In demo mode, Ollama is noted as offline/not required
    },
  };
}
