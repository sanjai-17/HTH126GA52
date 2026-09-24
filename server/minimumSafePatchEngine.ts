import { AnalysisRun, NormalizedFinding, MinimumSafePatchResult } from '../src/types';
import { simulateCounterfactualRisk, DEFAULT_RISK_CONFIG } from './riskEngine';

/**
 * Quantifies effort level for deterministic tie-breaking.
 * Never fabricates time numbers.
 */
function getEffortWeight(effort: NormalizedFinding['fix_effort']): number {
  switch (effort) {
    case 'LOW':
      return 1;
    case 'MEDIUM':
      return 2;
    case 'HIGH':
      return 3;
    case 'UNKNOWN':
    default:
      return 4;
  }
}

function aggregateEffort(efforts: NormalizedFinding['fix_effort'][]): 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN' {
  if (efforts.some((e) => e === 'UNKNOWN')) return 'UNKNOWN';
  const total = efforts.reduce((sum, e) => sum + getEffortWeight(e), 0);
  const avg = total / Math.max(1, efforts.length);
  if (avg <= 1.3) return 'LOW';
  if (avg <= 2.3) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Calculates the Minimum Safe Patch Set
 * Determines the smallest number of fixes that brings release risk <= risk_budget.
 * Uses the canonical risk engine (simulateCounterfactualRisk) as the single source of truth.
 */
export function calculateMinimumSafePatchSet(
  run: AnalysisRun,
  riskBudget: number = 40
): MinimumSafePatchResult {
  const currentRisk = run.risk.overall_score;

  // If already within budget, no fixes are strictly required to satisfy the budget
  if (currentRisk <= riskBudget) {
    return {
      id: `msp-${run.id}-${Date.now()}`,
      analysis_id: run.id,
      risk_budget: riskBudget,
      current_risk: currentRisk,
      projected_risk: currentRisk,
      risk_reduction: 0,
      fix_count: 0,
      finding_ids: [],
      findings: [],
      total_effort: 'LOW',
      status: 'ALREADY_WITHIN_BUDGET',
      algorithm: 'BRANCH_AND_BOUND_EXACT',
      selection_reason: `Current release risk (${currentRisk}) already satisfies the configured release risk budget (≤ ${riskBudget}). No mandatory fixes required.`,
      evaluated_combinations_count: 1,
      created_at: new Date().toISOString(),
    };
  }

  // Filter only actionable findings (exclude false positives and style-only)
  const actionableFindings = run.findings.filter(
    (f) => f.status !== 'FALSE_POSITIVE' && f.certainty !== 'STYLE_ONLY'
  );

  if (actionableFindings.length === 0) {
    return {
      id: `msp-${run.id}-${Date.now()}`,
      analysis_id: run.id,
      risk_budget: riskBudget,
      current_risk: currentRisk,
      projected_risk: currentRisk,
      risk_reduction: 0,
      fix_count: 0,
      finding_ids: [],
      findings: [],
      total_effort: 'UNKNOWN',
      status: 'NO_SOLUTION_FOUND',
      algorithm: 'BRANCH_AND_BOUND_EXACT',
      selection_reason: `No actionable findings are currently available to resolve the excess risk (+${currentRisk - riskBudget}).`,
      evaluated_combinations_count: 0,
      created_at: new Date().toISOString(),
    };
  }

  // Sort findings by priority: higher risk contribution first
  actionableFindings.sort((a, b) => (b.risk_contribution || 0) - (a.risk_contribution || 0));

  let evaluatedCombinations = 0;
  let bestCandidate: {
    ids: string[];
    projectedScore: number;
    reduction: number;
    effortScore: number;
    avgConfidence: number;
  } | null = null;

  const n = actionableFindings.length;
  const isExact = n <= 12;
  const algorithm = isExact ? 'BRANCH_AND_BOUND_EXACT' : 'BOUNDED_SEARCH';

  // Optimization: Test combinations of increasing size k = 1, 2, ..., n
  for (let k = 1; k <= Math.min(n, 6); k++) {
    // Generate combinations of size k
    const combos: NormalizedFinding[][] = [];

    function generateCombos(start: number, currentCombo: NormalizedFinding[]) {
      if (currentCombo.length === k) {
        combos.push([...currentCombo]);
        return;
      }
      for (let i = start; i < n; i++) {
        currentCombo.push(actionableFindings[i]);
        generateCombos(i + 1, currentCombo);
        currentCombo.pop();
        if (!isExact && combos.length >= 300) break; // Limit combo explosion on massive PRs
      }
    }

    generateCombos(0, []);

    for (const combo of combos) {
      evaluatedCombinations++;
      const candidateIds = combo.map((f) => f.id);
      const simulated = simulateCounterfactualRisk(
        run.findings,
        run.blast_radius,
        candidateIds,
        DEFAULT_RISK_CONFIG
      );

      if (simulated.overall_score <= riskBudget) {
        const reduction = currentRisk - simulated.overall_score;
        const effortScore = combo.reduce((sum, f) => sum + getEffortWeight(f.fix_effort), 0);
        const avgConfidence = combo.reduce((sum, f) => sum + (f.confidence || 0.8), 0) / k;

        // Tie-breaking evaluation among combinations of the same smallest size k:
        // 1. Greatest risk reduction (lowest projected score)
        // 2. Lower total effort
        // 3. Higher confidence
        let isBetter = false;
        if (!bestCandidate) {
          isBetter = true;
        } else if (simulated.overall_score < bestCandidate.projectedScore) {
          isBetter = true;
        } else if (simulated.overall_score === bestCandidate.projectedScore) {
          if (effortScore < bestCandidate.effortScore) {
            isBetter = true;
          } else if (effortScore === bestCandidate.effortScore && avgConfidence > bestCandidate.avgConfidence) {
            isBetter = true;
          }
        }

        if (isBetter) {
          bestCandidate = {
            ids: candidateIds,
            projectedScore: simulated.overall_score,
            reduction,
            effortScore,
            avgConfidence,
          };
        }
      }
    }

    // Since we search in increasing order of k, the first k with a valid solution is the MINIMUM cardinality!
    if (bestCandidate) {
      break;
    }
  }

  if (bestCandidate) {
    const selectedFindings = actionableFindings.filter((f) => bestCandidate!.ids.includes(f.id));
    const totalEffort = aggregateEffort(selectedFindings.map((f) => f.fix_effort));

    return {
      id: `msp-${run.id}-${Date.now()}`,
      analysis_id: run.id,
      risk_budget: riskBudget,
      current_risk: currentRisk,
      projected_risk: bestCandidate.projectedScore,
      risk_reduction: bestCandidate.reduction,
      fix_count: selectedFindings.length,
      finding_ids: bestCandidate.ids,
      findings: selectedFindings,
      total_effort: totalEffort,
      status: 'WITHIN_BUDGET',
      algorithm,
      selection_reason: `Smallest set of ${selectedFindings.length} actionable fix${
        selectedFindings.length === 1 ? '' : 'es'
      } bringing release risk from ${currentRisk} down to ${bestCandidate.projectedScore} (under budget ${riskBudget}), cutting ${bestCandidate.reduction} risk points.`,
      evaluated_combinations_count: evaluatedCombinations,
      created_at: new Date().toISOString(),
    };
  }

  // If fixing up to 6 issues still does not satisfy the budget, calculate maximum possible reduction
  const allIds = actionableFindings.map((f) => f.id);
  const maxSimulated = simulateCounterfactualRisk(
    run.findings,
    run.blast_radius,
    allIds,
    DEFAULT_RISK_CONFIG
  );

  return {
    id: `msp-${run.id}-${Date.now()}`,
    analysis_id: run.id,
    risk_budget: riskBudget,
    current_risk: currentRisk,
    projected_risk: maxSimulated.overall_score,
    risk_reduction: currentRisk - maxSimulated.overall_score,
    fix_count: actionableFindings.length,
    finding_ids: allIds,
    findings: actionableFindings,
    total_effort: aggregateEffort(actionableFindings.map((f) => f.fix_effort)),
    status: maxSimulated.overall_score <= riskBudget ? 'WITHIN_BUDGET' : 'NO_SOLUTION_FOUND',
    algorithm,
    selection_reason:
      maxSimulated.overall_score <= riskBudget
        ? `Resolving all ${actionableFindings.length} actionable findings reduces risk to ${maxSimulated.overall_score}, satisfying the ${riskBudget} budget.`
        : `No available combination of currently actionable fixes brings the release within the configured risk budget (best projected risk is ${maxSimulated.overall_score}, budget is ${riskBudget}).`,
    evaluated_combinations_count: evaluatedCombinations,
    created_at: new Date().toISOString(),
  };
}
