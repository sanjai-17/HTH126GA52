import {
  NormalizedFinding,
  RiskScore,
  RiskBreakdown,
  BlastRadiusAnalysis,
  FindingSeverity,
  FindingCategory,
} from '../src/types';

export interface RiskConfig {
  thresholdLowMax: number;
  thresholdModerateMax: number;
  thresholdElevatedMax: number;
  thresholdHighMax: number;
  thresholdCriticalMin: number;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  thresholdLowMax: 20,
  thresholdModerateMax: 40,
  thresholdElevatedMax: 60,
  thresholdHighMax: 80,
  thresholdCriticalMin: 81,
};

// Deterministic weights for severity
const SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  CRITICAL: 35,
  HIGH: 24,
  MEDIUM: 12,
  LOW: 4,
};

// Category multipliers
const CATEGORY_FACTORS: Record<FindingCategory, number> = {
  SECURITY: 1.25,
  BUG: 1.15,
  PERFORMANCE: 0.9,
  DEPENDENCY: 1.1,
  MAINTAINABILITY: 0.6,
  CODE_SMELL: 0.5,
  STYLE: 0.2,
};

/**
 * Calculates deterministic risk contribution for a single normalized finding
 */
export function calculateFindingRisk(finding: NormalizedFinding): number {
  // If classified as FALSE_POSITIVE or STYLE_ONLY, it should not add release risk
  if (finding.status === 'FALSE_POSITIVE' || finding.certainty === 'STYLE_ONLY') {
    return 0;
  }

  const baseWeight = SEVERITY_WEIGHTS[finding.severity] || 10;
  const confidence = Math.max(0.2, Math.min(1.0, finding.confidence || 0.8));
  const categoryMult = CATEGORY_FACTORS[finding.category] || 1.0;

  // Reachability factor
  let reachabilityMult = 1.0;
  if (finding.reachability) {
    if (finding.reachability.production_reachable === 'YES') reachabilityMult += 0.25;
    if (finding.reachability.user_controlled === 'YES') reachabilityMult += 0.25;
    if (finding.reachability.internet_facing === 'YES') reachabilityMult += 0.2;
    if (finding.reachability.sensitive_sink !== 'NONE' && finding.reachability.sensitive_sink !== 'UNKNOWN') {
      reachabilityMult += 0.2;
    }
  }

  // Verification status adjustment
  let statusMult = 1.0;
  if (finding.status === 'TRUE_POSITIVE') statusMult = 1.0;
  else if (finding.status === 'LIKELY_TRUE_POSITIVE') statusMult = 0.85;
  else if (finding.status === 'NEEDS_HUMAN_REVIEW') statusMult = 0.55;
  else if (finding.status === 'UNCERTAIN') statusMult = 0.35;

  const rawScore = baseWeight * confidence * categoryMult * reachabilityMult * statusMult;
  return Math.round(rawScore * 10) / 10;
}

/**
 * Calculates expected risk reduction if this finding is verified and resolved
 */
export function calculateExpectedReduction(finding: NormalizedFinding, currentContribution: number): number {
  if (currentContribution <= 0) return 0;
  // If fix is easily verified, reduction approaches 90-100% of contribution
  return Math.round(currentContribution * 0.95);
}

/**
 * Deterministic Release-Risk Engine
 * Aggregates all actionable findings, incorporates blast radius and dependency risk,
 * and produces an explainable 0 - 100 risk score.
 */
export function calculateReleaseRisk(
  findings: NormalizedFinding[],
  blastRadius: BlastRadiusAnalysis,
  config: RiskConfig = DEFAULT_RISK_CONFIG
): RiskScore {
  let securityPoints = 0;
  let bugsPoints = 0;
  let performancePoints = 0;
  let maintainabilityPoints = 0;
  let dependencyPoints = 0;

  findings.forEach((f) => {
    // Only count actionable or review-needed findings
    if (f.status === 'FALSE_POSITIVE') return;

    const risk = f.risk_contribution || calculateFindingRisk(f);

    switch (f.category) {
      case 'SECURITY':
        securityPoints += risk;
        break;
      case 'BUG':
        bugsPoints += risk;
        break;
      case 'PERFORMANCE':
        performancePoints += risk;
        break;
      case 'DEPENDENCY':
        dependencyPoints += risk;
        break;
      case 'MAINTAINABILITY':
      case 'CODE_SMELL':
      case 'STYLE':
        maintainabilityPoints += risk;
        break;
    }
  });

  // Calculate blast radius contribution deterministically
  let blastPoints = 0;
  if (blastRadius.level === 'CRITICAL') blastPoints = 14;
  else if (blastRadius.level === 'HIGH') blastPoints = 9;
  else if (blastRadius.level === 'MEDIUM') blastPoints = 5;
  else blastPoints = 2;

  if (blastRadius.api_endpoints > 2) blastPoints += 3;
  if (blastRadius.db_paths > 1) blastPoints += 3;

  // Add dependency risks if detected
  if (blastRadius.dependency_risk && blastRadius.dependency_risk.length > 0) {
    dependencyPoints += blastRadius.dependency_risk.length * 4;
  }

  // Cap individual category contributions to avoid arbitrary blowout
  const cappedSecurity = Math.min(45, Math.round(securityPoints));
  const cappedBugs = Math.min(30, Math.round(bugsPoints));
  const cappedPerf = Math.min(18, Math.round(performancePoints));
  const cappedBlast = Math.min(15, Math.round(blastPoints));
  const cappedDep = Math.min(15, Math.round(dependencyPoints));
  const cappedMaint = Math.min(10, Math.round(maintainabilityPoints));

  const totalRaw =
    cappedSecurity +
    cappedBugs +
    cappedPerf +
    cappedBlast +
    cappedDep +
    cappedMaint;

  // Normalize final score within 0 to 100
  const finalScore = Math.min(100, Math.max(0, totalRaw));

  // Determine risk level based on configured thresholds
  let riskLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (finalScore >= config.thresholdCriticalMin) {
    riskLevel = 'CRITICAL';
  } else if (finalScore > config.thresholdElevatedMax) {
    riskLevel = 'HIGH';
  } else if (finalScore > config.thresholdModerateMax) {
    riskLevel = 'ELEVATED';
  } else if (finalScore > config.thresholdLowMax) {
    riskLevel = 'MODERATE';
  } else {
    riskLevel = 'LOW';
  }

  const breakdown: RiskBreakdown = {
    security: cappedSecurity,
    bugs: cappedBugs,
    performance: cappedPerf,
    blast_radius: cappedBlast,
    dependency: cappedDep,
    maintainability: cappedMaint,
  };

  const primaryFactors: string[] = [];
  if (cappedSecurity >= 20) primaryFactors.push(`High security impact (+${cappedSecurity})`);
  if (cappedBugs >= 15) primaryFactors.push(`Functional bugs (+${cappedBugs})`);
  if (cappedBlast >= 8) primaryFactors.push(`Elevated blast radius (+${cappedBlast})`);
  if (cappedPerf >= 8) primaryFactors.push(`Performance degradation (+${cappedPerf})`);
  if (cappedDep >= 5) primaryFactors.push(`Dependency exposure (+${cappedDep})`);

  const explanation =
    primaryFactors.length > 0
      ? `Release risk is ${riskLevel} (${finalScore}/100) driven by: ${primaryFactors.join(', ')}.`
      : `Release risk is ${riskLevel} (${finalScore}/100) with minor isolated observations.`;

  return {
    overall_score: finalScore,
    risk_level: riskLevel,
    breakdown,
    explanation,
  };
}

/**
 * Counterfactual Risk Simulation ("What If I Fix This?")
 * Recalculates the exact risk score when a set of resolved finding IDs is assumed fixed.
 */
export function simulateCounterfactualRisk(
  allFindings: NormalizedFinding[],
  blastRadius: BlastRadiusAnalysis,
  resolvedFindingIds: string[],
  config: RiskConfig = DEFAULT_RISK_CONFIG
): RiskScore {
  const simulatedFindings = allFindings.map((f) => {
    if (resolvedFindingIds.includes(f.id)) {
      // Mark as fixed/resolved for the calculation
      return {
        ...f,
        risk_contribution: 0,
        status: 'TRUE_POSITIVE' as const, // Already handled
      };
    }
    return f;
  }).filter((f) => !resolvedFindingIds.includes(f.id));

  // If major issues are fixed, blast radius can also soften
  const simulatedBlast: BlastRadiusAnalysis = {
    ...blastRadius,
    level: resolvedFindingIds.length >= 2 && blastRadius.level === 'HIGH' ? 'MEDIUM' : blastRadius.level,
  };

  return calculateReleaseRisk(simulatedFindings, simulatedBlast, config);
}

/**
 * Top-3 Must-Fix Engine:
 * Prioritizes actionable findings using multi-criteria ranking:
 * Risk contribution, severity, confidence, reachability, blast radius, fix effort.
 */
export function determineTop3MustFix(findings: NormalizedFinding[]): NormalizedFinding[] {
  const actionable = findings.filter(
    (f) =>
      f.status !== 'FALSE_POSITIVE' &&
      f.certainty !== 'STYLE_ONLY' &&
      f.severity !== 'LOW'
  );

  const scored = actionable.map((f) => {
    let priorityScore = (f.risk_contribution || 0) * 1.5;

    // Severity bonus
    if (f.severity === 'CRITICAL') priorityScore += 30;
    else if (f.severity === 'HIGH') priorityScore += 20;
    else if (f.severity === 'MEDIUM') priorityScore += 8;

    // Reachability & Sink bonus
    if (f.reachability?.production_reachable === 'YES') priorityScore += 10;
    if (f.reachability?.user_controlled === 'YES') priorityScore += 10;
    if (f.reachability?.sensitive_sink === 'DATABASE' || f.reachability?.sensitive_sink === 'SHELL') {
      priorityScore += 15;
    }

    // Fix effort weighting: High impact + Low/Medium effort gets elevated
    if (f.fix_effort === 'LOW') priorityScore += 8;
    else if (f.fix_effort === 'MEDIUM') priorityScore += 4;

    return { finding: f, score: priorityScore };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((item, idx) => {
    const f = item.finding;
    f.is_must_fix = true;
    f.why_prioritized =
      f.why_prioritized ||
      `Ranked #${idx + 1} Must-Fix: Combines ${f.severity.toLowerCase()} severity with ${Math.round(
        (f.confidence || 0.9) * 100
      )}% confidence, ${
        f.reachability?.user_controlled === 'YES' ? 'user-controlled input, ' : ''
      }and +${f.risk_contribution} direct release-risk points.`;
    return f;
  });
}
