import React, { useState, useEffect } from 'react';
import { AnalysisRun, NormalizedFinding, IntentImpactAnalysis, PolicyCheckResult } from '../types';
import { fetchIntentImpact, fetchPolicyCheck } from '../services/api';
import { MustFixList } from '../components/common/MustFixList';
import { ActionButton } from '../components/common/ActionButton';
import { ReleaseRiskLine } from '../components/common/ReleaseRiskLine';
import { ArrowRight, FileCode, ChevronDown, ChevronUp, ShieldCheck, AlertCircle } from 'lucide-react';

interface OverviewProps {
  run: AnalysisRun;
  onNavigate: (page: any) => void;
  onSelectFinding: (finding: NormalizedFinding) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  run,
  onNavigate,
  onSelectFinding,
}) => {
  const [intentData, setIntentData] = useState<IntentImpactAnalysis | null>(null);
  const [policyData, setPolicyData] = useState<PolicyCheckResult | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchIntentImpact(run.id).catch(() => null),
      fetchPolicyCheck(run.id).catch(() => null),
    ]).then(([intent, policy]) => {
      if (mounted) {
        if (intent) setIntentData(intent);
        if (policy) setPolicyData(policy);
      }
    });
    return () => {
      mounted = false;
    };
  }, [run.id]);

  const actionableFindings = run.findings.filter((f) => f.status !== 'FALSE_POSITIVE');
  const mustFixFindings = actionableFindings
    .filter((f) => f.is_must_fix)
    .slice(0, 3);
  const prioritizedFindings = (mustFixFindings.length > 0 ? mustFixFindings : actionableFindings).slice(0, 3);

  const budget = policyData ? policyData.risk_budget : 40;
  const isOverBudget = run.risk.overall_score > budget;
  const budgetDelta = run.risk.overall_score - budget;

  return (
    <div className="max-w-3xl mx-auto space-y-7 py-2 text-[#F0F6FC]">
      {/* 1. PR Identity */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-[#8B949E] font-mono">
          <span className="text-[#F0F6FC] font-medium">{run.pr.repository}</span>
          <span className="text-[#586069]">•</span>
          <span>PR #{run.pr.pr_number}</span>
          <span className="text-[#586069]">•</span>
          <span className="text-[#586069]">
            {run.pr.base_branch} ← {run.pr.branch}
          </span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-[#F0F6FC]">
          {run.pr.title}
        </h1>
        {run.pr.author && (
          <p className="text-xs text-[#8B949E]">
            Opened by <span className="font-mono text-[#F0F6FC]">{run.pr.author}</span>
          </p>
        )}
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 2. PR Intent vs Actual Impact (INNOVATION FEATURE 2) */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
            Scope &amp; Impact analysis
          </h2>
          {intentData?.status === 'ADDITIONAL_IMPACT_DETECTED' && (
            <span className="text-[11px] font-mono text-[#FFB547] bg-[#FFB547]/10 border border-[#FFB547]/30 px-2 py-0.5 rounded">
              Additional impact detected
            </span>
          )}
        </div>

        <div className="p-3.5 rounded bg-[#111923] border border-[#1F2D3D] space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[#8B949E] text-[11px] font-mono uppercase">What this PR says</span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {intentData?.declared_scope.map((item) => (
                  <span
                    key={item}
                    className="px-2 py-0.5 rounded border border-[#1F2D3D] bg-[#0B1117] text-[#F0F6FC] font-mono text-[11px]"
                  >
                    {item.replace(/_/g, ' ')}
                  </span>
                )) || (
                  <span className="text-[#8B949E] font-mono text-[11px]">Analyzing title &amp; description...</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[#8B949E] text-[11px] font-mono uppercase">What the code actually touches</span>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {intentData?.actual_impact.map((item) => {
                  const isAdditional = intentData.additional_impact.includes(item);
                  return (
                    <span
                      key={item}
                      className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                        isAdditional
                          ? 'border-[#FFB547]/40 bg-[#FFB547]/10 text-[#FFB547]'
                          : 'border-[#1F2D3D] bg-[#0B1117] text-[#F0F6FC]'
                      }`}
                    >
                      {item.replace(/_/g, ' ')}
                      {isAdditional && ' *'}
                    </span>
                  );
                }) || (
                  <span className="text-[#8B949E] font-mono text-[11px]">Inspecting diff AST...</span>
                )}
              </div>
            </div>
          </div>

          {intentData && intentData.additional_impact.length > 0 && (
            <div className="pt-2 border-t border-[#1F2D3D]/60 flex items-center justify-between text-[11px]">
              <div className="text-[#8B949E]">
                <span className="text-[#FFB547] font-semibold">{intentData.additional_impact.length} additional area{intentData.additional_impact.length === 1 ? '' : 's'}</span> detected beyond declared title/description ({intentData.additional_impact.map((a) => a.replace(/_/g, ' ')).join(', ')}).
              </div>
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="text-[#8B949E] hover:text-[#B8F34A] flex items-center gap-1 font-mono cursor-pointer shrink-0 ml-2"
              >
                <span>{showEvidence ? 'Hide evidence' : 'View evidence'}</span>
                {showEvidence ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {showEvidence && intentData?.evidence && (
            <div className="pt-2 border-t border-[#1F2D3D] space-y-1.5 font-mono text-[11px]">
              <div className="text-[#8B949E] font-semibold text-[10px] uppercase">Grounded repository evidence:</div>
              <div className="divide-y divide-[#1F2D3D] bg-[#0B1117] rounded border border-[#1F2D3D] px-2.5">
                {intentData.evidence.map((ev, idx) => (
                  <div key={idx} className="py-2 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[#F0F6FC] font-medium truncate">
                        {ev.file}{ev.line ? `:${ev.line}` : ''}
                      </div>
                      <div className="text-[#8B949E] text-[10px]">{ev.description}</div>
                    </div>
                    <span className="text-[10px] text-[#FFB547] shrink-0 border border-[#1F2D3D] px-1.5 py-0.5 rounded">
                      {ev.area.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 3. Release Risk & SIGNATURE VISUAL & RELEASE RISK BUDGET */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
            Release risk &amp; Policy budget
          </h2>
          <button
            onClick={() => onNavigate('risk')}
            className="text-xs text-[#8B949E] hover:text-[#B8F34A] transition-colors cursor-pointer"
          >
            See policy &amp; simulation →
          </button>
        </div>

        {/* Big Score Readout & Policy Status */}
        <div className="flex flex-wrap items-baseline gap-4">
          <div className="text-4xl font-mono font-semibold tracking-tight text-[#F0F6FC]">
            {run.risk.overall_score}
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

          {/* Configured Policy Budget Status */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#8B949E]">Budget: {budget}/100</span>
            <span
              className={`px-2 py-0.5 rounded font-semibold text-[11px] border ${
                isOverBudget
                  ? 'text-[#FF5C5C] bg-[#FF5C5C]/10 border-[#FF5C5C]/30'
                  : 'text-[#3FB950] bg-[#3FB950]/10 border-[#3FB950]/30'
              }`}
            >
              {isOverBudget ? `OVER BUDGET (+${budgetDelta})` : 'WITHIN BUDGET'}
            </span>
          </div>

          <span className="text-xs text-[#8B949E] ml-auto">
            {actionableFindings.length} actionable issue{actionableFindings.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* DISTINCTIVE SIGNATURE VISUAL: RELEASE RISK LINE */}
        <div className="pt-1 pb-1">
          <ReleaseRiskLine
            score={run.risk.overall_score}
            riskLevel={run.risk.risk_level}
          />
        </div>

        {/* Action Prompt for Minimum Safe Patch */}
        {isOverBudget && (
          <div className="p-3 rounded bg-[#111923] border border-[#1F2D3D] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#8B949E]">
              <AlertCircle className="w-4 h-4 text-[#FFB547] shrink-0" />
              <span>Release policy blocked. Exceeds repository budget by +{budgetDelta} points.</span>
            </div>
            <button
              onClick={() => onNavigate('risk')}
              className="px-2.5 py-1 rounded bg-[#B8F34A] hover:bg-[#C6F764] text-[#0B1117] font-semibold text-xs transition-colors cursor-pointer shrink-0 ml-2"
            >
              Find minimum safe patch →
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 4. Fix Before Merging */}
      <div className="space-y-4">
        <MustFixList
          findings={prioritizedFindings}
          onSelectFinding={onSelectFinding}
          onViewAll={() => onNavigate('findings')}
          totalFindingsCount={actionableFindings.length}
        />

        <div className="pt-1">
          <ActionButton
            variant="primary"
            size="md"
            icon={ArrowRight}
            iconPosition="right"
            onClick={() => onNavigate('findings')}
          >
            Review issues
          </ActionButton>
        </div>
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 5. Changed Files Summary */}
      {run.pr.files && run.pr.files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
              Changed files ({run.pr.files.length})
            </h2>
            <button
              onClick={() => onNavigate('findings')}
              className="text-[#8B949E] hover:text-[#B8F34A] transition-colors cursor-pointer text-xs"
            >
              Inspect diffs
            </button>
          </div>

          <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D] text-xs">
            {run.pr.files.map((file, i) => {
              const fileIssues = run.findings.filter(
                (f) => f.file === file.filename && f.status !== 'FALSE_POSITIVE'
              );

              return (
                <div
                  key={i}
                  className="py-2.5 flex items-center justify-between hover:bg-[#111923] px-2 -mx-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-2 font-mono truncate">
                    <FileCode className="w-3.5 h-3.5 text-[#586069] shrink-0" />
                    <span className="text-[#F0F6FC] truncate">{file.filename}</span>
                    {fileIssues.length > 0 && (
                      <span className="text-[11px] text-[#FF5C5C] font-mono">
                        ({fileIssues.length} issue{fileIssues.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] shrink-0 text-[#8B949E]">
                    <span className="text-[#3FB950]">+{file.additions}</span>
                    <span className="text-[#FF5C5C]">-{file.deletions}</span>
                    <button
                      onClick={() => {
                        const firstFinding = fileIssues[0] || run.findings.find((f) => f.file === file.filename);
                        if (firstFinding) onSelectFinding(firstFinding);
                        else onNavigate('findings');
                      }}
                      className="text-[#8B949E] hover:text-[#B8F34A] transition-colors cursor-pointer ml-1"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
