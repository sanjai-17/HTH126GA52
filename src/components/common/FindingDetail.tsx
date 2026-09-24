import React, { useState } from 'react';
import { NormalizedFinding, FixVerificationResult } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { FixOutcomeBadge, CheckStatusBadge } from '../common/StatusBadge';
import { MonacoDiffViewer } from '../common/MonacoDiffViewer';
import { verifyFix, generateTest, submitDeveloperFeedback } from '../../services/api';
import { ActionButton } from '../common/ActionButton';
import { Play, Terminal, ChevronDown, X } from 'lucide-react';

interface FindingDetailProps {
  finding: NormalizedFinding;
  allFindings?: NormalizedFinding[];
  onSelectOtherFinding?: (finding: NormalizedFinding) => void;
  onFindingUpdated?: (updated: NormalizedFinding) => void;
  onSimulateRisk?: (finding: NormalizedFinding) => void;
  onClose?: () => void;
}

export const FindingDetail: React.FC<FindingDetailProps> = ({
  finding,
  onFindingUpdated,
  onClose,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<FixVerificationResult | undefined>(
    finding.verification_result
  );
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testCode, setTestCode] = useState<string | undefined>(finding.test_code);
  const [humanDecision, setHumanDecision] = useState<string | null>(finding.user_feedback || null);

  const handleRunVerification = async () => {
    if (!finding.patch) return;
    setIsVerifying(true);
    try {
      const res = await verifyFix(finding.id, finding.patch);
      setVerificationResult(res);
      const updated = { ...finding, verification_result: res };
      if (onFindingUpdated) onFindingUpdated(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGenerateTest = async () => {
    setIsGeneratingTest(true);
    try {
      const res = await generateTest(finding.id);
      setTestCode(res.test_code);
      const updated = {
        ...finding,
        test_code: res.test_code,
        test_status: res.test_status as any,
      };
      if (onFindingUpdated) onFindingUpdated(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const handleDecision = async (
    status: 'USEFUL' | 'NOT_USEFUL' | 'FALSE_POSITIVE' | 'FIXED' | 'WONT_FIX' | 'NEEDS_REVIEW'
  ) => {
    try {
      await submitDeveloperFeedback(finding.id, finding.title, finding.file, status);
      setHumanDecision(status);
      const updated = { ...finding, user_feedback: status };
      if (onFindingUpdated) onFindingUpdated(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0B1117] overflow-hidden text-[#F0F6FC]">
      {/* Top Header: Finding Identity */}
      <div className="px-4 py-2 border-b border-[#1F2D3D] bg-[#0B1117] flex items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#111923] text-[#8B949E] hover:text-[#F0F6FC] cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <SeverityBadge severity={finding.severity} size="sm" />
          <h2 className="text-xs font-semibold text-[#F0F6FC] truncate">
            {finding.title}
          </h2>
          <span className="font-mono text-xs text-[#586069] truncate">
            {finding.file}:{finding.line_start}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs text-[#FFB547]">
            +{finding.risk_contribution} risk
          </span>
        </div>
      </div>

      {/* Main Split: CENTER = Code/Diff, RIGHT = Explanation & Actions */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* CENTER: Monaco Code / Diff Viewer */}
        <div className="flex-1 lg:w-[55%] flex flex-col border-b lg:border-b-0 lg:border-r border-[#1F2D3D] bg-[#0B1117] overflow-hidden min-h-0">
          <div className="px-3 py-1.5 border-b border-[#1F2D3D] bg-[#111923]/60 flex items-center justify-between text-xs text-[#8B949E] shrink-0 font-mono">
            <span>{finding.file}</span>
            <span className="text-[#586069]">line {finding.line_start}</span>
          </div>

          <div className="flex-1 min-h-[220px] overflow-hidden">
            <MonacoDiffViewer
              filename={finding.file}
              originalCode={finding.original_code || finding.evidence}
              modifiedCode={finding.fixed_code || finding.original_code || finding.suggested_fix}
              highlightLine={finding.line_start}
              height="100%"
            />
          </div>

          {/* Remediation summary below diff */}
          <div className="p-3 border-t border-[#1F2D3D] bg-[#0B1117] text-xs space-y-1 shrink-0">
            <div className="text-[#8B949E] font-mono text-[11px] uppercase tracking-wider">Suggested fix</div>
            <p className="text-[#F0F6FC] leading-relaxed">{finding.suggested_fix}</p>
          </div>
        </div>

        {/* RIGHT: Finding Explanation & Progressive Disclosure */}
        <div className="w-full lg:w-[45%] flex flex-col overflow-y-auto bg-[#0B1117] p-4 space-y-4 min-h-0 text-xs">
          {/* 1. WHY THIS MATTERS (VISIBLE) */}
          <div className="space-y-1">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#8B949E]">
              Why this matters
            </h3>
            <p className="text-[#F0F6FC] leading-relaxed text-xs">
              {finding.explanation || finding.why_prioritized}
            </p>
          </div>

          {/* 2. EVIDENCE (VISIBLE) */}
          <div className="space-y-1">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#8B949E]">
              Evidence
            </h3>
            <div className="font-mono text-[11px] text-[#8B949E]">
              {finding.source.toUpperCase()} • {finding.rule_id}
            </div>
          </div>

          {/* 3. IMPACT (VISIBLE) */}
          {finding.impact && (
            <div className="space-y-1">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#8B949E]">
                Impact
              </h3>
              <p className="text-[#8B949E] leading-relaxed text-xs">
                {finding.impact}
              </p>
            </div>
          )}

          {/* 4. ACTIONS (VISIBLE) */}
          <div className="space-y-2.5 pt-2 border-t border-[#1F2D3D]">
            <div className="flex items-center gap-2 flex-wrap">
              <ActionButton
                variant="primary"
                size="sm"
                icon={Play}
                loading={isVerifying}
                onClick={handleRunVerification}
              >
                Verify fix
              </ActionButton>

              <ActionButton
                variant="secondary"
                size="sm"
                icon={Terminal}
                loading={isGeneratingTest}
                onClick={handleGenerateTest}
              >
                Generate test
              </ActionButton>
            </div>

            {/* Verification Result if available */}
            {verificationResult && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#F0F6FC]">Verification status</span>
                  <FixOutcomeBadge outcome={verificationResult.overall_status} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 p-2 rounded bg-[#111923] border border-[#1F2D3D]">
                  <CheckStatusBadge
                    status={verificationResult.patch_applied ? 'PASS' : 'FAIL'}
                    label="Patch applied"
                  />
                  <CheckStatusBadge
                    status={verificationResult.syntax_check}
                    label="Syntax check"
                  />
                  <CheckStatusBadge
                    status={verificationResult.static_analysis}
                    label="Static analysis"
                  />
                  <CheckStatusBadge
                    status={verificationResult.regression_check}
                    label="Test"
                  />
                </div>
              </div>
            )}

            {/* Generated Test Code if available */}
            {testCode && (
              <div className="space-y-1 pt-2">
                <div className="text-[#8B949E] font-medium">Generated test code</div>
                <pre className="p-2.5 rounded bg-[#111923] border border-[#1F2D3D] font-mono text-[11px] text-[#F0F6FC] overflow-x-auto whitespace-pre-wrap">
                  {testCode}
                </pre>
              </div>
            )}

            {/* Developer Decision */}
            <div className="pt-2 flex items-center gap-2 text-xs">
              <span className="text-[#586069]">Mark as:</span>
              <button
                onClick={() => handleDecision('FIXED')}
                className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  humanDecision === 'FIXED'
                    ? 'bg-[#17212B] text-[#B8F34A] border-[#B8F34A]/40'
                    : 'text-[#8B949E] border-[#1F2D3D] hover:text-[#F0F6FC]'
                }`}
              >
                Fixed
              </button>
              <button
                onClick={() => handleDecision('FALSE_POSITIVE')}
                className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  humanDecision === 'FALSE_POSITIVE'
                    ? 'bg-[#17212B] text-[#F0F6FC] border-[#2A3A4D]'
                    : 'text-[#8B949E] border-[#1F2D3D] hover:text-[#F0F6FC]'
                }`}
              >
                False positive
              </button>
              <button
                onClick={() => handleDecision('NEEDS_REVIEW')}
                className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  humanDecision === 'NEEDS_REVIEW'
                    ? 'bg-[#17212B] text-[#FFB547] border-[#FFB547]/40'
                    : 'text-[#8B949E] border-[#1F2D3D] hover:text-[#F0F6FC]'
                }`}
              >
                Needs review
              </button>
            </div>
          </div>

          {/* PROGRESSIVE DISCLOSURE: COLLAPSED SECTIONS */}
          <div className="space-y-2 pt-2 border-t border-[#1F2D3D]">
            {/* Evidence details */}
            <details className="group border border-[#1F2D3D] rounded p-2.5 bg-[#111923]/40">
              <summary className="cursor-pointer font-medium text-[#8B949E] hover:text-[#F0F6FC] flex items-center justify-between select-none">
                <span>Evidence details</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-[#586069]" />
              </summary>
              <pre className="mt-2 p-2 rounded bg-[#0B1117] border border-[#1F2D3D] font-mono text-[11px] text-[#F0F6FC] whitespace-pre-wrap">
                {finding.evidence}
              </pre>
            </details>

            {/* Reachability */}
            <details className="group border border-[#1F2D3D] rounded p-2.5 bg-[#111923]/40">
              <summary className="cursor-pointer font-medium text-[#8B949E] hover:text-[#F0F6FC] flex items-center justify-between select-none">
                <span>Reachability</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-[#586069]" />
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-[#0B1117] border border-[#1F2D3D]">
                  <div className="text-[#586069]">Internet facing</div>
                  <div className="font-medium text-[#F0F6FC] mt-0.5">{finding.reachability?.internet_facing || 'No'}</div>
                </div>
                <div className="p-2 rounded bg-[#0B1117] border border-[#1F2D3D]">
                  <div className="text-[#586069]">User controlled</div>
                  <div className="font-medium text-[#F0F6FC] mt-0.5">{finding.reachability?.user_controlled || 'No'}</div>
                </div>
                <div className="p-2 rounded bg-[#0B1117] border border-[#1F2D3D]">
                  <div className="text-[#586069]">Production reachable</div>
                  <div className="font-medium text-[#F0F6FC] mt-0.5">{finding.reachability?.production_reachable || 'No'}</div>
                </div>
                <div className="p-2 rounded bg-[#0B1117] border border-[#1F2D3D]">
                  <div className="text-[#586069]">Sensitive sink</div>
                  <div className="font-medium text-[#F0F6FC] mt-0.5">{finding.reachability?.sensitive_sink || 'None'}</div>
                </div>
              </div>
            </details>

            {/* Blast radius */}
            <details className="group border border-[#1F2D3D] rounded p-2.5 bg-[#111923]/40">
              <summary className="cursor-pointer font-medium text-[#8B949E] hover:text-[#F0F6FC] flex items-center justify-between select-none">
                <span>Blast radius</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-[#586069]" />
              </summary>
              <div className="mt-2 text-[#8B949E] space-y-1 text-xs">
                <p>Changes in <span className="font-mono text-[#F0F6FC]">{finding.file}</span> affect callers across this module.</p>
                <div className="text-[11px] font-mono text-[#586069]">
                  Fix effort estimate: {finding.fix_effort || 'LOW'}
                </div>
              </div>
            </details>

            {/* AI assessment */}
            <details className="group border border-[#1F2D3D] rounded p-2.5 bg-[#111923]/40">
              <summary className="cursor-pointer font-medium text-[#8B949E] hover:text-[#F0F6FC] flex items-center justify-between select-none">
                <span>AI assessment</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-[#586069]" />
              </summary>
              <div className="mt-2 space-y-1.5 text-[#8B949E] text-xs">
                <div className="text-[11px] font-mono text-[#586069]">
                  Certainty: {finding.certainty} ({(finding.confidence * 100).toFixed(0)}%)
                </div>
                <p>{finding.explanation}</p>
                {finding.fp_reason && (
                  <div className="p-2 rounded bg-[#0B1117] border border-[#1F2D3D] text-[11px] text-[#8B949E]">
                    Filter reason: {finding.fp_reason}
                  </div>
                )}
              </div>
            </details>

            {/* Raw analyzer output */}
            <details className="group border border-[#1F2D3D] rounded p-2.5 bg-[#111923]/40">
              <summary className="cursor-pointer font-medium text-[#8B949E] hover:text-[#F0F6FC] flex items-center justify-between select-none">
                <span>Raw analyzer output</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-[#586069]" />
              </summary>
              <pre className="mt-2 p-2 rounded bg-[#0B1117] border border-[#1F2D3D] font-mono text-[10px] text-[#8B949E] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(
                  {
                    rule_id: finding.rule_id,
                    source: finding.source,
                    severity: finding.severity,
                    file: finding.file,
                    line_start: finding.line_start,
                    line_end: finding.line_end,
                    reachability: finding.reachability,
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};
