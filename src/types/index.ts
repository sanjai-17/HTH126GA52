// Common Data Models for AI Code Review & Release-Risk Assistant

export type FindingCategory =
  | 'SECURITY'
  | 'BUG'
  | 'PERFORMANCE'
  | 'CODE_SMELL'
  | 'MAINTAINABILITY'
  | 'STYLE'
  | 'DEPENDENCY';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type FindingCertainty =
  | 'CONFIRMED'
  | 'HIGH_CONFIDENCE'
  | 'LIKELY'
  | 'POSSIBLE'
  | 'STYLE_ONLY';

export type VerificationStatus =
  | 'TRUE_POSITIVE'
  | 'LIKELY_TRUE_POSITIVE'
  | 'FALSE_POSITIVE'
  | 'UNCERTAIN'
  | 'NEEDS_HUMAN_REVIEW';

export type FixVerificationOutcome =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'FAILED'
  | 'NOT_VERIFIED';

export type CheckStatus = 'PASS' | 'FAIL' | 'NOT_RUN';

export interface ReachabilityAnalysis {
  internet_facing: 'YES' | 'NO' | 'UNKNOWN';
  user_controlled: 'YES' | 'NO' | 'UNKNOWN';
  production_reachable: 'YES' | 'NO' | 'UNKNOWN';
  sensitive_sink: 'DATABASE' | 'SHELL' | 'FILE_SYSTEM' | 'AUTH' | 'NONE' | 'UNKNOWN';
  crosses_auth_boundary: 'YES' | 'NO' | 'UNKNOWN';
}

export interface FixVerificationResult {
  patch_applied: boolean;
  syntax_check: CheckStatus;
  static_analysis: CheckStatus;
  finding_resolved: 'RESOLVED' | 'UNRESOLVED';
  regression_check: CheckStatus;
  tests_status: CheckStatus;
  tests_output?: string;
  overall_status: FixVerificationOutcome;
  details: string;
  verified_at: string;
}

export interface NormalizedFinding {
  id: string;
  category: FindingCategory;
  type: string;
  severity: FindingSeverity;
  certainty: FindingCertainty;
  confidence: number; // 0.0 to 1.0
  file: string;
  line_start: number;
  line_end: number;
  title: string;
  source: 'semgrep' | 'bandit' | 'ruff' | 'eslint' | 'dependency_check';
  rule_id: string;
  raw_message: string;
  evidence: string;
  status: VerificationStatus;
  fp_reason?: string; // Reason why this was shielded / classified as false positive
  reachability: ReachabilityAnalysis;
  explanation: string;
  impact: string;
  suggested_fix: string;
  patch?: string; // Unified diff or code patch
  fixed_code?: string; // Full or replacement code after fix
  original_code?: string; // Original snippet
  fix_effort: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  risk_contribution: number; // Score points this finding adds to total risk
  expected_risk_reduction: number; // Score reduction if fixed
  is_must_fix: boolean;
  why_prioritized?: string;
  verification_result?: FixVerificationResult;
  test_code?: string;
  test_status?: CheckStatus;
  user_feedback?: 'USEFUL' | 'NOT_USEFUL' | 'FALSE_POSITIVE' | 'FIXED' | 'WONT_FIX' | 'NEEDS_REVIEW';
  feedback_notes?: string;
}

export interface PRFile {
  filename: string;
  status: 'modified' | 'added' | 'removed';
  additions: number;
  deletions: number;
  patch: string;
  content_before?: string;
  content_after?: string;
}

export interface PullRequestMetadata {
  id: string;
  repository: string;
  pr_number: number;
  title: string;
  author: string;
  author_avatar?: string;
  branch: string;
  base_branch: string;
  created_at: string;
  files_changed: number;
  lines_added: number;
  lines_deleted: number;
  description?: string;
  files: PRFile[];
}

export interface BlastRadiusAnalysis {
  files_affected: number;
  functions_affected: number;
  modules_affected: number;
  api_endpoints: number;
  db_paths: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detected_elements: string[];
  dependency_risk?: {
    package_name: string;
    old_version: string;
    new_version: string;
    direct: boolean;
    potential_impact: string;
    evidence: string;
  }[];
}

export interface RiskBreakdown {
  security: number;
  bugs: number;
  performance: number;
  blast_radius: number;
  dependency: number;
  maintainability: number;
}

export interface RiskScore {
  overall_score: number; // 0 - 100
  risk_level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  breakdown: RiskBreakdown;
  explanation: string;
}

export interface AnalysisRun {
  id: string;
  pr: PullRequestMetadata;
  created_at: string;
  mode: 'DEMO' | 'LOCAL_AI';
  ai_provider: string;
  ai_model: string;
  raw_findings_count: number;
  actionable_findings_count: number;
  false_positives_count: number;
  needs_review_count: number;
  findings: NormalizedFinding[];
  top_3_must_fix: NormalizedFinding[];
  risk: RiskScore;
  blast_radius: BlastRadiusAnalysis;
  tool_health: {
    semgrep: boolean;
    bandit: boolean;
    ruff: boolean;
    eslint: boolean;
    ollama: boolean;
  };
}

export interface GroundTruthEvaluation {
  scenario_id: string;
  scenario_name: string;
  ground_truth_issues_count: number;
  raw_findings_detected: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number; // TP / (TP + FP)
  recall: number; // TP / (TP + FN)
  f1_score: number;
  fp_shield_reduction_pct: number; // Reduction in noise via contextual verification
  localization_accuracy: number; // % exact line matches
  fix_verification_rate: number; // % fixes successfully validated
}

export interface OverallEvaluationMetrics {
  total_scenarios: number;
  total_ground_truth: number;
  total_raw_detected: number;
  total_tp: number;
  total_fp: number;
  total_fn: number;
  overall_precision: number;
  overall_recall: number;
  overall_f1: number;
  avg_fp_reduction_rate: number;
  avg_localization_accuracy: number;
  avg_fix_verification_rate: number;
  scenarios: GroundTruthEvaluation[];
  last_evaluated: string;
}

export interface RepositoryMemoryItem {
  id: string;
  type: 'KNOWN_FALSE_POSITIVE' | 'ACCEPTED_PATTERN' | 'IGNORED_FILE' | 'CONVENTION';
  pattern: string;
  file_pattern?: string;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface DeveloperFeedbackRecord {
  id: string;
  finding_id: string;
  finding_title: string;
  file: string;
  status: 'USEFUL' | 'NOT_USEFUL' | 'FALSE_POSITIVE' | 'FIXED' | 'WONT_FIX' | 'NEEDS_REVIEW';
  notes?: string;
  created_at: string;
}

// -------------------------------------------------------------
// ADDITIVE INNOVATION TYPES: RISK BUDGET, MIN SAFE PATCH, INTENT/IMPACT
// -------------------------------------------------------------

export interface ReleasePolicy {
  id: string;
  repository_id: string;
  risk_budget: number; // 0 - 100, e.g. 40
  max_critical_security: number; // 0
  max_high_security: number; // 0
  require_verified_fixes: boolean; // e.g. true
  require_tests_passed: boolean; // e.g. true
  updated_at: string;
}

export type PolicyEvaluationState =
  | 'WITHIN_BUDGET'
  | 'OVER_BUDGET'
  | 'BLOCKED'
  | 'WARNING'
  | 'VERIFICATION_REQUIRED';

export interface PolicyCheckItem {
  id: string;
  name: string;
  passed: boolean;
  actual_value: string | number;
  threshold_value: string | number;
  message: string;
  evidence?: string;
}

export interface PolicyCheckResult {
  policy: ReleasePolicy;
  overall_status: PolicyEvaluationState;
  score: number;
  risk_budget: number;
  budget_delta: number; // positive = over budget, negative/0 = within budget
  checks: PolicyCheckItem[];
  reasons: string[];
  evaluated_at: string;
}

export type IntentCategory =
  | 'DEPENDENCY'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'DATABASE'
  | 'API'
  | 'UI'
  | 'BUSINESS_LOGIC'
  | 'PERFORMANCE'
  | 'TESTING'
  | 'REFACTORING'
  | 'CONFIGURATION'
  | 'LOGGING'
  | 'SECURITY'
  | 'OTHER';

export interface IntentImpactEvidence {
  area: IntentCategory;
  file: string;
  line?: number;
  function_name?: string;
  source: string;
  description: string;
}

export interface IntentImpactAnalysis {
  id: string;
  analysis_id: string;
  declared_scope: IntentCategory[];
  actual_impact: IntentCategory[];
  additional_impact: IntentCategory[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_EVIDENCE';
  status: 'ADDITIONAL_IMPACT_DETECTED' | 'ALIGNED' | 'INSUFFICIENT_EVIDENCE';
  declared_summary: string;
  actual_summary: string;
  evidence: IntentImpactEvidence[];
  created_at: string;
}

export interface MinimumSafePatchResult {
  id: string;
  analysis_id: string;
  risk_budget: number;
  current_risk: number;
  projected_risk: number;
  risk_reduction: number;
  fix_count: number;
  finding_ids: string[];
  findings: NormalizedFinding[];
  total_effort: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  status: 'WITHIN_BUDGET' | 'ALREADY_WITHIN_BUDGET' | 'NO_SOLUTION_FOUND';
  algorithm: 'BRANCH_AND_BOUND_EXACT' | 'BOUNDED_SEARCH';
  selection_reason: string;
  evaluated_combinations_count: number;
  created_at: string;
}

