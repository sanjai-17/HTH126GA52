import React, { useState } from 'react';
import { AnalysisRun, NormalizedFinding } from '../types';
import { FixOutcomeBadge } from '../components/common/StatusBadge';
import { verifyFix } from '../services/api';
import { ActionButton } from '../components/common/ActionButton';
import { Check, X, Clock, Play } from 'lucide-react';

interface FixVerificationProps {
  run: AnalysisRun;
  onSelectFinding: (finding: NormalizedFinding) => void;
}

export const FixVerification: React.FC<FixVerificationProps> = ({ run, onSelectFinding }) => {
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [localFindings, setLocalFindings] = useState<NormalizedFinding[]>(run.findings);

  const actionableFindings = localFindings.filter((f) => f.status !== 'FALSE_POSITIVE' && f.patch);
  const verifiedCount = actionableFindings.filter(
    (f) => f.verification_result?.overall_status === 'VERIFIED'
  ).length;

  const handleVerifyOne = async (finding: NormalizedFinding) => {
    if (!finding.patch) return;
    setVerifyingId(finding.id);
    try {
      const result = await verifyFix(finding.id, finding.patch);
      setLocalFindings((prev) =>
        prev.map((f) => (f.id === finding.id ? { ...f, verification_result: result } : f))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyAll = async () => {
    setVerifyingAll(true);
    try {
      const updated = await Promise.all(
        localFindings.map(async (f) => {
          if (f.status === 'FALSE_POSITIVE' || !f.patch) return f;
          const result = await verifyFix(f.id, f.patch);
          return { ...f, verification_result: result };
        })
      );
      setLocalFindings(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyingAll(false);
    }
  };

  const renderCheckItem = (label: string, status?: 'PASS' | 'FAIL' | 'NOT_RUN' | boolean) => {
    if (status === 'PASS' || status === true) {
      return (
        <span className="flex items-center gap-1.5 text-[#B8F34A]">
          <Check className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      );
    }
    if (status === 'FAIL' || status === false) {
      return (
        <span className="flex items-center gap-1.5 text-[#FF5C5C]">
          <X className="w-3.5 h-3.5" />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-[#586069]">
        <Clock className="w-3.5 h-3.5" />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2 text-[#F0F6FC]">
      {/* Title & Actions */}
      <div className="flex items-baseline justify-between border-b border-[#1F2D3D] pb-4 select-none">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-[#F0F6FC]">
            Fix verification
          </h1>
          <p className="text-xs text-[#8B949E]">
            {actionableFindings.length} issue{actionableFindings.length === 1 ? '' : 's'} checked
          </p>
        </div>

        <ActionButton
          variant="primary"
          size="sm"
          icon={Play}
          loading={verifyingAll}
          onClick={handleVerifyAll}
        >
          Verify all fixes
        </ActionButton>
      </div>

      {/* Verification Pipeline List */}
      <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D]">
        {actionableFindings.map((finding) => {
          const res = finding.verification_result;
          const isVerifying = verifyingId === finding.id;

          return (
            <div key={finding.id} className="py-4 space-y-3">
              {/* Finding Title & Location */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#F0F6FC]">
                    {finding.title}
                  </div>
                  <div className="font-mono text-[11px] text-[#586069]">
                    {finding.file}:{finding.line_start}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {res && <FixOutcomeBadge outcome={res.overall_status} />}
                  <button
                    onClick={() => onSelectFinding(finding)}
                    className="text-xs text-[#8B949E] hover:text-[#B8F34A] transition-colors cursor-pointer"
                  >
                    Inspect diff →
                  </button>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono p-2.5 rounded bg-[#111923] border border-[#1F2D3D]">
                <div>
                  {renderCheckItem(
                    'Patch applied',
                    res ? res.patch_applied : undefined
                  )}
                </div>
                <div>
                  {renderCheckItem(
                    finding.category === 'DEPENDENCY' ? 'Dependency check' : 'Syntax check',
                    res ? res.syntax_check : undefined
                  )}
                </div>
                <div>
                  {renderCheckItem(
                    'Static analysis',
                    res ? res.static_analysis : undefined
                  )}
                </div>
                <div>
                  {renderCheckItem(
                    'Test',
                    res ? res.regression_check : undefined
                  )}
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <div className="text-[#8B949E] font-mono text-[11px]">
                  {res ? res.details : 'Verification pending'}
                </div>

                <button
                  onClick={() => handleVerifyOne(finding)}
                  disabled={isVerifying}
                  className="text-xs text-[#8B949E] hover:text-[#F0F6FC] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? 'Running checks...' : 'Re-verify'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
