import React, { useState } from 'react';
import { AnalysisRun, NormalizedFinding } from '../types';
import { simulateRisk } from '../services/api';
import { ReleaseRiskLine } from '../components/common/ReleaseRiskLine';
import { ActionButton } from '../components/common/ActionButton';
import { ChevronDown, CheckSquare, Square, RotateCcw } from 'lucide-react';

interface RiskAnalysisProps {
  run: AnalysisRun;
  onSelectFinding: (finding: NormalizedFinding) => void;
}

export const RiskAnalysis: React.FC<RiskAnalysisProps> = ({ run, onSelectFinding }) => {
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [simulatedScore, setSimulatedScore] = useState<number | undefined>(undefined);
  const [riskReduction, setRiskReduction] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const actionableFindings = run.findings.filter((f) => f.status !== 'FALSE_POSITIVE');

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

  const currentScore = run.risk.overall_score;
  const activeScore = simulatedScore !== undefined ? simulatedScore : currentScore;

  return (
    <div className="max-w-3xl mx-auto space-y-7 py-2 text-[#F0F6FC]">
      {/* 1. TOP: RELEASE RISK & SIGNATURE VISUAL */}
      <div className="space-y-3">
        <h1 className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
          Release risk
        </h1>

        <div className="flex items-baseline gap-4">
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

      {/* 2. WHY IS THE RELEASE AT RISK? */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#F0F6FC]">
          Why is the release at risk?
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

      {/* 3. IF YOU FIX THESE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[#F0F6FC]">
              If you fix these
            </h2>
            <p className="text-xs text-[#8B949E]">
              Select issues to project risk reduction before merging.
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

      <div className="border-t border-[#1F2D3D]" />

      {/* 4. SECONDARY: HOW IS THIS CALCULATED? */}
      <details className="group border border-[#1F2D3D] rounded bg-[#111923] p-3 text-xs">
        <summary className="cursor-pointer font-medium text-[#8B949E] hover:text-[#F0F6FC] flex items-center justify-between select-none">
          <span>How is this calculated?</span>
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180 text-[#586069]" />
        </summary>

        <div className="mt-3 space-y-3.5 text-xs text-[#8B949E] border-t border-[#1F2D3D] pt-3">
          <div className="space-y-1">
            <h4 className="font-medium text-[#F0F6FC]">Mathematical Model</h4>
            <p className="leading-relaxed">
              Risk score = Base finding severity weights × Reachability coefficient (1.5× for user-controlled input, 2.0× for sensitive sinks) + Blast radius penalty + Dependency factor, normalized to 0–100.
            </p>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-medium text-[#F0F6FC]">Blast Radius Metrics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded bg-[#0B1117] border border-[#1F2D3D]">
                <div className="text-[#586069]">Files</div>
                <div className="text-[#F0F6FC] mt-0.5">{run.blast_radius.files_affected}</div>
              </div>
              <div className="p-2 rounded bg-[#0B1117] border border-[#1F2D3D]">
                <div className="text-[#586069]">Functions</div>
                <div className="text-[#F0F6FC] mt-0.5">{run.blast_radius.functions_affected}</div>
              </div>
              <div className="p-2 rounded bg-[#0B1117] border border-[#1F2D3D]">
                <div className="text-[#586069]">Modules</div>
                <div className="text-[#F0F6FC] mt-0.5">{run.blast_radius.modules_affected}</div>
              </div>
              <div className="p-2 rounded bg-[#0B1117] border border-[#1F2D3D]">
                <div className="text-[#586069]">Endpoints</div>
                <div className="text-[#F0F6FC] mt-0.5">{run.blast_radius.api_endpoints}</div>
              </div>
              <div className="p-2 rounded bg-[#0B1117] border border-[#1F2D3D]">
                <div className="text-[#586069]">DB paths</div>
                <div className="text-[#F0F6FC] mt-0.5">{run.blast_radius.db_paths}</div>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
};
