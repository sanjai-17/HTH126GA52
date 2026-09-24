import assert from 'node:assert';
import { getDemoAnalysisRun } from '../server/demoScenarios';
import { calculateMinimumSafePatchSet } from '../server/minimumSafePatchEngine';
import { extractDeclaredScope, analyzeIntentVsImpact } from '../server/intentImpactEngine';
import { evaluateReleasePolicy, DEFAULT_RELEASE_POLICY } from '../server/releasePolicyService';
import { simulateCounterfactualRisk } from '../server/riskEngine';
import { AnalysisRun, NormalizedFinding } from '../src/types';

console.log('--- RUNNING CODEGUARD SPECIFICATION TESTS ---');

let passed = 0;
let total = 0;

function test(name: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`✓ Test ${total}: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`✗ Test ${total}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// 1. Minimum safe patch with one required fix
test('1. Minimum safe patch with one required fix', () => {
  const run = getDemoAnalysisRun('demo-5');
  // If budget is 45, fixing SQL injection (-22 risk) brings 64 -> 42 (which is <= 45) with just 1 fix!
  const result = calculateMinimumSafePatchSet(run, 45);
  assert.strictEqual(result.status, 'WITHIN_BUDGET');
  assert.strictEqual(result.fix_count, 1, `Expected 1 fix, got ${result.fix_count}`);
  assert.ok(result.projected_risk <= 45);
});

// 2. Minimum safe patch with multiple required fixes
test('2. Minimum safe patch with multiple required fixes', () => {
  const run = getDemoAnalysisRun('demo-5');
  // With budget 40, one fix alone (SQL injection -22 -> 42) is > 40.
  // Requires 2 fixes: SQL injection + coupon error -> 30, or SQL injection + dependency downgrade -> 14!
  const result = calculateMinimumSafePatchSet(run, 40);
  assert.strictEqual(result.status, 'WITHIN_BUDGET');
  assert.strictEqual(result.fix_count, 2, `Expected 2 fixes, got ${result.fix_count}`);
  assert.ok(result.projected_risk <= 40, `Projected risk ${result.projected_risk} should be <= 40`);
});

// 3. No possible safe patch
test('3. No possible safe patch', () => {
  const run = getDemoAnalysisRun('demo-5');
  // If budget is ridiculously low, e.g. 5, fixing all available actionable issues brings risk to 14, which cannot reach 5.
  const result = calculateMinimumSafePatchSet(run, 5);
  assert.strictEqual(result.status, 'NO_SOLUTION_FOUND');
  assert.ok(result.selection_reason.includes('No available combination'));
});

// 4. Already-within-budget release
test('4. Already-within-budget release', () => {
  const run = getDemoAnalysisRun('demo-5');
  // Current score is 64; if budget is 80, already within budget
  const result = calculateMinimumSafePatchSet(run, 80);
  assert.strictEqual(result.status, 'ALREADY_WITHIN_BUDGET');
  assert.strictEqual(result.fix_count, 0);
  assert.strictEqual(result.projected_risk, 64);
});

// 5. Risk calculation consistency
test('5. Risk calculation consistency', () => {
  const run = getDemoAnalysisRun('demo-5');
  const result = calculateMinimumSafePatchSet(run, 40);
  // Verify that simulating the returned finding IDs through the canonical risk engine produces the exact same score
  const canonicalSim = simulateCounterfactualRisk(run.findings, run.blast_radius, result.finding_ids);
  assert.strictEqual(result.projected_risk, canonicalSim.overall_score);
  assert.strictEqual(result.risk_reduction, run.risk.overall_score - canonicalSim.overall_score);
});

// 6. Risk budget pass
test('6. Risk budget pass', () => {
  const run = getDemoAnalysisRun('demo-5');
  const policy = { ...DEFAULT_RELEASE_POLICY, risk_budget: 70, max_critical_security: 5, max_high_security: 5 };
  const evalResult = evaluateReleasePolicy(run, policy);
  const budgetCheck = evalResult.checks.find((c) => c.id === 'risk-budget');
  assert.ok(budgetCheck && budgetCheck.passed, 'Risk budget check should pass when score (64) <= budget (70)');
});

// 7. Risk budget fail
test('7. Risk budget fail', () => {
  const run = getDemoAnalysisRun('demo-5');
  const policy = { ...DEFAULT_RELEASE_POLICY, risk_budget: 40 };
  const evalResult = evaluateReleasePolicy(run, policy);
  const budgetCheck = evalResult.checks.find((c) => c.id === 'risk-budget');
  assert.ok(budgetCheck && !budgetCheck.passed, 'Risk budget check should fail when score (64) > budget (40)');
  assert.ok(evalResult.budget_delta === 24, `Budget delta should be 24, got ${evalResult.budget_delta}`);
});

// 8. Critical finding policy
test('8. Critical finding policy', () => {
  const run = getDemoAnalysisRun('demo-5');
  // Demo 5 has a critical vulnerability finding (jsonwebtoken CVE)
  const policy = { ...DEFAULT_RELEASE_POLICY, max_critical_security: 0 };
  const evalResult = evaluateReleasePolicy(run, policy);
  const critCheck = evalResult.checks.find((c) => c.id === 'critical-security');
  assert.ok(critCheck && !critCheck.passed, 'Critical finding check should fail when max is 0 and 1 exists');
  assert.strictEqual(evalResult.overall_status, 'BLOCKED');
});

// 9. Verification-required policy
test('9. Verification-required policy', () => {
  const run = getDemoAnalysisRun('demo-5');
  const policy = { ...DEFAULT_RELEASE_POLICY, require_verified_fixes: true };
  const evalResult = evaluateReleasePolicy(run, policy);
  const fixCheck = evalResult.checks.find((c) => c.id === 'fix-verification');
  assert.ok(fixCheck);
});

// 10. Intent extraction
test('10. Intent extraction', () => {
  const title = 'chore(deps): Upgrade core libraries & refactor promo discount redemption';
  const desc = 'Bumps express and jsonwebtoken versions';
  const scope = extractDeclaredScope(title, desc);
  assert.ok(scope.includes('DEPENDENCY'), 'Should detect DEPENDENCY from upgrade/bump');
  assert.ok(scope.includes('BUSINESS_LOGIC'), 'Should detect BUSINESS_LOGIC from promo discount redemption');
  assert.ok(scope.includes('REFACTORING'), 'Should detect REFACTORING from refactor');
});

// 11. Actual impact extraction
test('11. Actual impact extraction', () => {
  const run = getDemoAnalysisRun('demo-5');
  const analysis = analyzeIntentVsImpact(run);
  assert.ok(analysis.actual_impact.includes('DEPENDENCY'), 'Actual impact should include DEPENDENCY');
  assert.ok(analysis.actual_impact.includes('DATABASE'), 'Actual impact should include DATABASE (from SQL sink in coupon.ts)');
  assert.ok(analysis.actual_impact.includes('API'), 'Actual impact should include API (from checkout.ts route & blast radius)');
});

// 12. Intent/impact comparison
test('12. Intent/impact comparison', () => {
  const run = getDemoAnalysisRun('demo-5');
  const analysis = analyzeIntentVsImpact(run);
  assert.strictEqual(analysis.status, 'ADDITIONAL_IMPACT_DETECTED');
  assert.ok(analysis.additional_impact.length > 0);
  assert.ok(analysis.evidence.length > 0);
});

// 13. Insufficient evidence
test('13. Insufficient evidence', () => {
  const emptyRun: AnalysisRun = {
    ...getDemoAnalysisRun('demo-1'),
    pr: {
      ...getDemoAnalysisRun('demo-1').pr,
      title: '',
      description: '',
      files: [],
    },
    findings: [],
    blast_radius: {
      files_affected: 0,
      functions_affected: 0,
      modules_affected: 0,
      api_endpoints: 0,
      db_paths: 0,
      level: 'LOW',
      detected_elements: [],
    },
  };
  const analysis = analyzeIntentVsImpact(emptyRun);
  assert.strictEqual(analysis.status, 'INSUFFICIENT_EVIDENCE');
  assert.strictEqual(analysis.confidence, 'INSUFFICIENT_EVIDENCE');
});

// 14. Demo mode
test('14. Demo mode', () => {
  const run1 = getDemoAnalysisRun('demo-1');
  const run2 = getDemoAnalysisRun('demo-2');
  const run5 = getDemoAnalysisRun('demo-5');
  assert.strictEqual(run1.mode, 'DEMO');
  assert.strictEqual(run2.mode, 'DEMO');
  assert.strictEqual(run5.mode, 'DEMO');
  assert.ok(run5.findings.length > 0);
  assert.ok(run5.risk.overall_score > 0);
});

// 15. Existing functionality regression
test('15. Existing functionality regression', () => {
  const run = getDemoAnalysisRun('demo-1');
  // Ensure existing properties remain intact
  assert.ok(run.id);
  assert.ok(run.pr.repository);
  assert.ok(run.top_3_must_fix.length > 0);
  assert.ok(run.risk.breakdown.security !== undefined);
  assert.ok(run.tool_health.semgrep);
});

console.log(`\nAll ${passed}/${total} test specifications passed successfully!`);
