import React from 'react';
import { AnalysisRun, NormalizedFinding } from '../types';
import { MustFixList } from '../components/common/MustFixList';
import { ActionButton } from '../components/common/ActionButton';
import { ReleaseRiskLine } from '../components/common/ReleaseRiskLine';
import { ArrowRight, FileCode } from 'lucide-react';

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
  const actionableFindings = run.findings.filter((f) => f.status !== 'FALSE_POSITIVE');
  const mustFixFindings = actionableFindings
    .filter((f) => f.is_must_fix)
    .slice(0, 3);
  const prioritizedFindings = (mustFixFindings.length > 0 ? mustFixFindings : actionableFindings).slice(0, 3);

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

      {/* 2. Release Risk & SIGNATURE VISUAL (Release Risk Line) */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#8B949E]">
            Release risk
          </h2>
          <button
            onClick={() => onNavigate('risk')}
            className="text-xs text-[#8B949E] hover:text-[#B8F34A] transition-colors cursor-pointer"
          >
            See risk breakdown →
          </button>
        </div>

        {/* Big Score Readout */}
        <div className="flex items-baseline gap-4">
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

          <span className="text-xs text-[#8B949E]">
            {actionableFindings.length} issue{actionableFindings.length === 1 ? '' : 's'} need attention
          </span>
        </div>

        {/* DISTINCTIVE SIGNATURE VISUAL: RELEASE RISK LINE */}
        <div className="pt-1 pb-1">
          <ReleaseRiskLine
            score={run.risk.overall_score}
            riskLevel={run.risk.risk_level}
          />
        </div>
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 3. Fix Before Merging */}
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

      {/* 4. Changed Files Summary */}
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
