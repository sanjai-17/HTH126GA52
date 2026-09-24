import { AnalysisRun, ReleasePolicy, PolicyCheckResult, PolicyCheckItem, PolicyEvaluationState } from '../src/types';

// Default repository release policy
export const DEFAULT_RELEASE_POLICY: ReleasePolicy = {
  id: 'policy-default',
  repository_id: 'default',
  risk_budget: 40,
  max_critical_security: 0,
  max_high_security: 0,
  require_verified_fixes: true,
  require_tests_passed: true,
  updated_at: new Date().toISOString(),
};

// In-memory policy storage by repository ID
const policyStore = new Map<string, ReleasePolicy>();
policyStore.set('default', { ...DEFAULT_RELEASE_POLICY });

export function getReleasePolicy(repoId: string = 'default'): ReleasePolicy {
  return policyStore.get(repoId) || { ...DEFAULT_RELEASE_POLICY };
}

export function updateReleasePolicy(repoId: string = 'default', updates: Partial<ReleasePolicy>): ReleasePolicy {
  const current = getReleasePolicy(repoId);
  const updated: ReleasePolicy = {
    ...current,
    ...updates,
    repository_id: repoId,
    updated_at: new Date().toISOString(),
  };
  policyStore.set(repoId, updated);
  return updated;
}

/**
 * Deterministic Release Policy Evaluator
 * Evaluates an AnalysisRun against repository release policy.
 * There is NO AI hallucination; every check evaluates concrete evidence.
 */
export function evaluateReleasePolicy(
  run: AnalysisRun,
  policy: ReleasePolicy = getReleasePolicy(run.pr.repository || 'default')
): PolicyCheckResult {
  const currentRisk = run.risk.overall_score;
  const checks: PolicyCheckItem[] = [];
  const reasons: string[] = [];

  // Check 1: Risk Budget
  const budgetDelta = currentRisk - policy.risk_budget;
  const budgetPassed = currentRisk <= policy.risk_budget;
  checks.push({
    id: 'risk-budget',
    name: 'Risk budget',
    passed: budgetPassed,
    actual_value: `${currentRisk} / 100`,
    threshold_value: `≤ ${policy.risk_budget} / 100`,
    message: budgetPassed
      ? `Release risk (${currentRisk}) is within configured budget (${policy.risk_budget}).`
      : `Release risk (${currentRisk}) exceeds configured budget (${policy.risk_budget}) by +${budgetDelta} points.`,
    evidence: run.risk.explanation,
  });
  if (!budgetPassed) {
    reasons.push(`Risk score (${currentRisk}) exceeds budget limit (${policy.risk_budget}).`);
  }

  // Check 2: Critical Security Findings
  const criticalFindings = run.findings.filter(
    (f) =>
      f.status !== 'FALSE_POSITIVE' &&
      (f.category === 'SECURITY' || f.category === 'DEPENDENCY') &&
      f.severity === 'CRITICAL'
  );
  const criticalPassed = criticalFindings.length <= policy.max_critical_security;
  checks.push({
    id: 'critical-security',
    name: 'Critical security findings',
    passed: criticalPassed,
    actual_value: criticalFindings.length,
    threshold_value: `≤ ${policy.max_critical_security}`,
    message: criticalPassed
      ? `No unmitigated critical security findings detected.`
      : `${criticalFindings.length} unmitigated critical security finding(s) detected: ${criticalFindings.map((f) => f.title).join('; ')}.`,
    evidence: criticalFindings.map((f) => `${f.file}:${f.line_start} - ${f.title}`).join('\n'),
  });
  if (!criticalPassed) {
    reasons.push(`Contains ${criticalFindings.length} critical security finding(s) (allowed: ${policy.max_critical_security}).`);
  }

  // Check 3: High Security Findings
  const highFindings = run.findings.filter(
    (f) =>
      f.status !== 'FALSE_POSITIVE' &&
      (f.category === 'SECURITY' || f.category === 'DEPENDENCY') &&
      f.severity === 'HIGH'
  );
  const highPassed = highFindings.length <= policy.max_high_security;
  checks.push({
    id: 'high-security',
    name: 'High security findings',
    passed: highPassed,
    actual_value: highFindings.length,
    threshold_value: `≤ ${policy.max_high_security}`,
    message: highPassed
      ? `High security findings within policy tolerance.`
      : `${highFindings.length} unmitigated high security finding(s) detected.`,
    evidence: highFindings.map((f) => `${f.file}:${f.line_start} - ${f.title}`).join('\n'),
  });
  if (!highPassed) {
    reasons.push(`Contains ${highFindings.length} high security finding(s) (allowed: ${policy.max_high_security}).`);
  }

  // Check 4: Required Verified Fixes
  let verificationPassed = true;
  if (policy.require_verified_fixes) {
    const unverifiedMustFix = run.top_3_must_fix.filter(
      (f) => !f.verification_result || f.verification_result.overall_status !== 'VERIFIED'
    );
    verificationPassed = unverifiedMustFix.length === 0;
    checks.push({
      id: 'fix-verification',
      name: 'Fix verification',
      passed: verificationPassed,
      actual_value: verificationPassed ? 'ALL VERIFIED' : `${unverifiedMustFix.length} UNVERIFIED`,
      threshold_value: 'REQUIRED FOR MUST-FIX',
      message: verificationPassed
        ? `All top prioritized fixes have executed verification passing.`
        : `${unverifiedMustFix.length} must-fix issue(s) lack executed and verified patches.`,
      evidence: unverifiedMustFix.map((f) => f.title).join('; '),
    });
    if (!verificationPassed) {
      reasons.push(`${unverifiedMustFix.length} must-fix patch(es) pending automated verification.`);
    }
  }

  // Check 5: Tests Passed
  let testsPassed = true;
  if (policy.require_tests_passed) {
    const failedTests = run.findings.filter(
      (f) => f.test_status === 'FAIL' || (f.verification_result && f.verification_result.tests_status === 'FAIL')
    );
    testsPassed = failedTests.length === 0;
    checks.push({
      id: 'test-execution',
      name: 'Invariant tests',
      passed: testsPassed,
      actual_value: testsPassed ? 'PASS' : 'FAIL',
      threshold_value: 'ALL PASS',
      message: testsPassed
        ? `All security invariant and regression test suites pass.`
        : `${failedTests.length} test suite(s) report failure or regression.`,
      evidence: failedTests.map((f) => `${f.title}: test failed`).join('\n'),
    });
    if (!testsPassed) {
      reasons.push('Safety invariant tests failing on proposed code.');
    }
  }

  // Determine overall status
  let overallStatus: PolicyEvaluationState = 'WITHIN_BUDGET';
  if (!criticalPassed || !testsPassed) {
    overallStatus = 'BLOCKED';
  } else if (!budgetPassed) {
    overallStatus = 'OVER_BUDGET';
  } else if (!highPassed || !verificationPassed) {
    overallStatus = 'VERIFICATION_REQUIRED';
  }

  return {
    policy,
    overall_status: overallStatus,
    score: currentRisk,
    risk_budget: policy.risk_budget,
    budget_delta: budgetDelta,
    checks,
    reasons,
    evaluated_at: new Date().toISOString(),
  };
}
