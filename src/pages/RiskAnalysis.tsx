import React, { useState, useEffect } from 'react';
import { AnalysisRun, NormalizedFinding, PolicyCheckResult, MinimumSafePatchResult } from '../types';
import { simulateRisk, fetchPolicyCheck, fetchMinimumSafePatch } from '../services/api';
import { ReleaseRiskLine } from '../components/common/ReleaseRiskLine';
import { ActionButton } from '../components/common/ActionButton';
import { ChevronDown, ChevronUp, CheckSquare, Square, RotateCcw, ShieldCheck, Sparkles, CheckCircle, XCircle } from 'lucide-react';

interface RiskAnalysisProps {
  run: AnalysisRun;
  onSelectFinding: (finding: NormalizedFinding) => void;
}

export const RiskAnalysis: React.FC<RiskAnalysisProps> = ({ run, onSelectFinding }) => {
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [simulatedScore, setSimulatedScore] = useState<number | undefined>(undefined);
  const [riskReduction, setRiskReduction] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Policy check & Minimum Safe Patch Set state
  const [policyData, setPolicyData] = useState<PolicyCheckResult | null>(null);
  const [minPatchData, setMinPatchData] = useState<MinimumSafePatchResult | null>(null);
  const [loadingMinPatch, setLoadingMinPatch] = useState(false);
  const [showAlgorithmDetails, setShowAlgorithmDetails] = useState(false);
  const [showAllPolicyChecks, setShowAllPolicyChecks] = useState(false);

  const actionableFindings = run.findings.filter((f) => f.status !== 'FALSE_POSITIVE');
  const currentScore = run.risk.overall_score;

  // Load policy check & calculate minimum safe patch
  useEffect(() => {
    let mounted = true;
    fetchPolicyCheck(run.id)
      .then((policy) => {
        if (mounted && policy) {
          setPolicyData(policy);
          setLoadingMinPatch(true);
          return fetchMinimumSafePatch(run.id, policy.risk_budget);
        }
        return null;
      })
      .then((minPatch) => {
        if (mounted && minPatch) {
          setMinPatchData(minPatch);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (mounted) setLoadingMinPatch(false);
      });

    return () => {
      mounted = false;
    };
  }, [run.id]);

  const toggleResolved = (findingId: string) => {
    let next: string[];
    if (resolvedIds.includes(findingId)) {
      next = resolvedIds.filter((id) => id !== findingId);
    } else {
      next = [...resolvedIds, findingId];
    }
    setResolvedIds(next);

    if (next.length === 0) {
      setSimulatedScore(undefined);
      setRiskReduction(0);
    }
  };

  const runSimulation = async () => {
    if (resolvedIds.length === 0) return;
    setIsSimulating(true);
    try {
      const res = await simulateRisk(run.id, resolvedIds);
      setSimulatedScore(res.simulated_score);
      setRiskReduction(res.risk_reduction);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplyMinimumPatch = async () => {
    if (!minPatchData || minPatchData.finding_ids.length === 0) return;
    setResolvedIds(minPatchData.finding_ids);
    setIsSimulating(true);
    try {
      const res = await simulateRisk(run.id, minPatchData.finding_ids);
      setSimulatedScore(res.simulated_score);
      setRiskReduction(res.risk_reduction);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleFixAllBlockers = async () => {
    const blockerIds = actionableFindings
      .filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH' || f.is_must_fix)
      .map((f) => f.id);

    setResolvedIds(blockerIds);
    setIsSimulating(true);
    try {
      const res = await simulateRisk(run.id, blockerIds);
      setSimulatedScore(res.simulated_score);
      setRiskReduction(res.risk_reduction);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetSimulation = () => {
    setResolvedIds([]);
    setSimulatedScore(undefined);
    setRiskReduction(0);
  };

  const activeScore = simulatedScore !== undefined ? simulatedScore : currentScore;
  const configuredBudget = policyData ? policyData.risk_budget : 40;
  const isOverBudget = activeScore > configuredBudget;

  return (
    <div className="max-w-3xl mx-auto space-y-7 py-2 text-[#F0F6FC]">
      {/* 1. TOP: RELEASE RISK & SIGNATURE VISUAL */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
            Release risk
          </h1>
          <span className="text-xs font-mono text-[#8B949E]">
            Configured budget: {configuredBudget}/100
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-4">
          <div className="text-4xl font-mono font-semibold tracking-tight text-[#F0F6FC]">
            {activeScore}
            <span className="text-base font-normal text-[#586069] ml-1">/ 100</span>
          </div>

          <span
            className={`text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded border ${
              run.risk.risk_level === 'CRITICAL'
                ? 'text-[#FF5C5C] bg-[#FF5C5C]/10 border-[#FF5C5C]/30'
                : run.risk.risk_level === 'HIGH' || run.risk.risk_level === 'ELEVATED'
                ? 'text-[#FFB547] bg-[#FFB547]/10 border-[#FFB547]/30'
                : 'text-[#3FB950] bg-[#3FB950]/10 border-[#3FB950]/30'
            }`}
          >
            {run.risk.risk_level}
          </span>

          <span
            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
              isOverBudget
                ? 'text-[#FF5C5C] bg-[#FF5C5C]/10 border-[#FF5C5C]/30'
                : 'text-[#3FB950] bg-[#3FB950]/10 border-[#3FB950]/30'
            }`}
          >
            {isOverBudget ? `OVER BUDGET (+${activeScore - configuredBudget})` : 'WITHIN BUDGET'}
          </span>

          {simulatedScore !== undefined && (
            <span className="text-xs font-mono text-[#B8F34A]">
              (-{riskReduction} pts projected)
            </span>
          )}
        </div>

        {/* SIGNATURE VISUAL: RELEASE RISK LINE */}
        <div className="pt-1 pb-1">
          <ReleaseRiskLine
            score={currentScore}
            riskLevel={run.risk.risk_level}
            simulatedScore={simulatedScore}
          />
        </div>
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 2. RELEASE RISK BUDGET & POLICY CHECKS (INNOVATION FEATURE 3) */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[#F0F6FC]">
              Repository release policy
            </h2>
            <p className="text-xs text-[#8B949E]">
              Policy gates evaluated deterministically against concrete evidence.
            </p>
          </div>
          {policyData && (
            <span
              className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                policyData.overall_status === 'WITHIN_BUDGET'
                  ? 'text-[#3FB950] bg-[#3FB950]/10 border-[#3FB950]/30'
                  : policyData.overall_status === 'BLOCKED'
                  ? 'text-[#FF5C5C] bg-[#FF5C5C]/10 border-[#FF5C5C]/30'
                  : 'text-[#FFB547] bg-[#FFB547]/10 border-[#FFB547]/30'
              }`}
            >
              {policyData.overall_status.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {policyData && (
          <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D] text-xs">
            {policyData.checks.map((check) => (
              <div key={check.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {check.passed ? (
                    <CheckCircle className="w-4 h-4 text-[#3FB950] shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#FF5C5C] shrink-0" />
                  )}
                  <span className="text-[#F0F6FC] font-medium">{check.name}</span>
                  <span className="text-[#586069] font-mono text-[11px] hidden sm:inline">
                    ({check.actual_value} / target {check.threshold_value})
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded font-semibold ${
                      check.passed ? 'text-[#3FB950] bg-[#3FB950]/10' : 'text-[#FF5C5C] bg-[#FF5C5C]/10'
                    }`}
                  >
                    {check.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 3. MINIMUM SAFE PATCH SET (INNOVATION FEATURE 1) */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#F0F6FC]">
                Minimum safe patch set
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-[#B8F34A]/40 text-[#B8F34A] bg-[#B8F34A]/10">
                OPTIMIZED
              </span>
            </div>
            <p className="text-xs text-[#8B949E]">
              Smallest set of actionable fixes required to bring release risk within budget ({configuredBudget}).
            </p>
          </div>

          {minPatchData && (
            <span className="text-xs font-mono text-[#8B949E]">
              {minPatchData.fix_count} fix{minPatchData.fix_count === 1 ? '' : 'es'} required
            </span>
          )}
        </div>

        {minPatchData && minPatchData.status === 'WITHIN_BUDGET' ? (
          <div className="p-4 rounded border border-[#1F2D3D] bg-[#111923] space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1F2D3D]/60 font-mono">
              <div className="flex items-center gap-2 text-[#F0F6FC]">
                <span>Projected risk:</span>
                <span className="text-[#FF5C5C] font-semibold">{minPatchData.current_risk}</span>
                <span>→</span>
                <span className="text-[#B8F34A] font-bold">{minPatchData.projected_risk}</span>
                <span className="text-[#3FB950] font-semibold">(-{minPatchData.risk_reduction} pts)</span>
              </div>
              <div className="text-[11px] text-[#8B949E]">
                Effort:{' '}
                <span className="text-[#F0F6FC] font-semibold">
                  {minPatchData.total_effort}
                </span>
              </div>
            </div>

            {/* List of fixes in this minimum set */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase text-[#8B949E]">
                Required fixes to reach budget ({minPatchData.findings.length}):
              </div>
              <div className="divide-y divide-[#1F2D3D] bg-[#0B1117] rounded border border-[#1F2D3D] px-2.5">
                {minPatchData.findings.map((f, idx) => (
                  <div key={f.id} className="py-2 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <span className="font-mono text-[#8B949E] mr-2">#{idx + 1}</span>
                      <span className="text-[#F0F6FC] font-medium">{f.title}</span>
                      <span className="font-mono text-[11px] text-[#586069] ml-2">{f.file}:{f.line_start}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                      <span className="text-[#B8F34A] font-semibold">-{f.expected_risk_reduction} risk</span>
                      <span className="text-[#8B949E]">
                        {f.fix_effort ? `Effort: ${f.fix_effort}` : 'Effort: UNKNOWN'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <ActionButton
                variant="primary"
                size="sm"
                icon={Sparkles}
                onClick={handleApplyMinimumPatch}
              >
                Simulate minimum safe patch
              </ActionButton>

              <button
                onClick={() => setShowAlgorithmDetails(!showAlgorithmDetails)}
                className="text-xs text-[#8B949E] hover:text-[#F0F6FC] flex items-center gap-1 font-mono cursor-pointer"
              >
                <span>How was this selected?</span>
                {showAlgorithmDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showAlgorithmDetails && (
              <div className="p-3 rounded bg-[#0B1117] border border-[#1F2D3D] space-y-1.5 text-[11px] font-mono text-[#8B949E]">
                <div className="text-[#F0F6FC] font-semibold">Deterministic Selection Model:</div>
                <p>{minPatchData.selection_reason}</p>
                <div className="text-[#586069] pt-1">
                  Algorithm: {minPatchData.algorithm} ({minPatchData.evaluated_combinations_count} combinations evaluated).
                  Zero arbitrary LLM values; all projections computed via the canonical counterfactual risk engine.
                </div>
              </div>
            )}
          </div>
        ) : minPatchData?.status === 'ALREADY_WITHIN_BUDGET' ? (
          <div className="p-3.5 rounded border border-[#3FB950]/30 bg-[#3FB950]/10 text-xs font-mono text-[#3FB950]">
            Release risk ({currentScore}) already satisfies configured budget (≤ {configuredBudget}). No mandatory patches required.
          </div>
        ) : (
          <div className="p-3.5 rounded border border-[#1F2D3D] bg-[#111923] text-xs font-mono text-[#8B949E]">
            {loadingMinPatch ? 'Evaluating minimum safe patch set...' : 'No available subset of currently actionable fixes reaches the budget.'}
          </div>
        )}
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 4. WHY IS THE RELEASE AT RISK? */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#F0F6FC]">
          Where the risk comes from
        </h2>

        <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D] text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-[#8B949E]">Security vulnerabilities</span>
            <span className="font-mono text-[#FFB547] font-medium">+{run.risk.breakdown.security}</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-[#8B949E]">Functional bugs</span>
            <span className="font-mono text-[#FFB547] font-medium">+{run.risk.breakdown.bugs}</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-[#8B949E]">Performance</span>
            <span className="font-mono text-[#8B949E] font-medium">+{run.risk.breakdown.performance}</span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-[#8B949E]">Blast radius impact</span>
            <span className="font-mono text-[#8B949E] font-medium">+{run.risk.breakdown.blast_radius}</span>
          </div>
          {run.risk.breakdown.dependency > 0 && (
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#8B949E]">Dependency vulnerability</span>
              <span className="font-mono text-[#FF5C5C] font-medium">+{run.risk.breakdown.dependency}</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 5. INTERACTIVE COUNTERFACTUAL SIMULATOR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[#F0F6FC]">
              Interactive fix simulation
            </h2>
            <p className="text-xs text-[#8B949E]">
              Select issues manually to test counterfactual risk reduction.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleFixAllBlockers}
              className="text-xs text-[#8B949E] hover:text-[#B8F34A] underline cursor-pointer"
            >
              Select blockers
            </button>
            {resolvedIds.length > 0 && (
              <button
                onClick={handleResetSimulation}
                className="text-xs text-[#586069] hover:text-[#8B949E] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D] text-xs">
          {actionableFindings.map((f) => {
            const isChecked = resolvedIds.includes(f.id);
            return (
              <div
                key={f.id}
                onClick={() => toggleResolved(f.id)}
                className="py-2.5 flex items-center justify-between hover:bg-[#111923] px-2 -mx-2 rounded cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="text-[#8B949E]">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-[#B8F34A]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#586069]" />
                    )}
                  </div>
                  <div className="truncate">
                    <span className="text-[#F0F6FC] font-medium">{f.title}</span>
                    <span className="text-[#586069] font-mono text-[11px] ml-2">{f.file}:{f.line_start}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
                  <span className="text-[#B8F34A] font-medium">-{f.expected_risk_reduction}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFinding(f);
                    }}
                    className="text-[#8B949E] hover:text-[#F0F6FC] cursor-pointer"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Projected Risk Readout & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <ActionButton
            variant="primary"
            size="md"
            loading={isSimulating}
            disabled={resolvedIds.length === 0}
            onClick={runSimulation}
          >
            Simulate selected fixes ({resolvedIds.length})
          </ActionButton>

          {simulatedScore !== undefined && (
            <div className="text-xs font-mono text-[#8B949E]">
              Projected risk:{' '}
              <span className="text-[#F0F6FC] font-bold">{currentScore}</span>
              {' → '}
              <span className="text-[#B8F34A] font-bold">{simulatedScore}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
