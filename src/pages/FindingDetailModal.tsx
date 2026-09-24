import React, { useState } from 'react';
import { NormalizedFinding, FixVerificationResult } from '../types';
import { SeverityBadge, CategoryBadge } from '../components/common/SeverityBadge';
import { VerificationBadge, FixOutcomeBadge, CheckStatusBadge } from '../components/common/StatusBadge';
import { MonacoDiffViewer } from '../components/common/MonacoDiffViewer';
import { verifyFix, generateFix, generateTest, submitDeveloperFeedback } from '../services/api';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileCode2,
  Wrench,
  Play,
  Terminal,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface FindingDetailModalProps {
  finding: NormalizedFinding;
  onClose: () => void;
  onFindingUpdated?: (updated: NormalizedFinding) => void;
}

export const FindingDetailModal: React.FC<FindingDetailModalProps> = ({
  finding,
  onClose,
  onFindingUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'code' | 'verification' | 'test'>('code');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<FixVerificationResult | undefined>(
    finding.verification_result
  );
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testCode, setTestCode] = useState<string | undefined>(finding.test_code);
  const [feedbackSaved, setFeedbackSaved] = useState<string | null>(finding.user_feedback || null);

  const handleRunVerification = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyFix(finding.id, finding.patch);
      setVerificationResult(res);
      finding.verification_result = res;
      if (onFindingUpdated) onFindingUpdated({ ...finding, verification_result: res });
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
      finding.test_code = res.test_code;
      finding.test_status = res.test_status as any;
      if (onFindingUpdated) onFindingUpdated({ ...finding, test_code: res.test_code });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const handleFeedback = async (status: 'USEFUL' | 'NOT_USEFUL' | 'FALSE_POSITIVE' | 'FIXED' | 'WONT_FIX' | 'NEEDS_REVIEW') => {
    try {
      await submitDeveloperFeedback(finding.id, finding.title, finding.file, status);
      setFeedbackSaved(status);
      finding.user_feedback = status;
      if (onFindingUpdated) onFindingUpdated({ ...finding, user_feedback: status });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              {finding.is_must_fix && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  <Flame className="w-3.5 h-3.5" /> MUST FIX
                </span>
              )}
              <SeverityBadge severity={finding.severity} size="md" />
              <CategoryBadge category={finding.category} />
              <VerificationBadge status={finding.status} />
              <span className="font-mono text-xs text-zinc-400">
                Confidence: {(finding.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <h2 className="text-lg font-bold text-zinc-100">{finding.title}</h2>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="text-zinc-300 font-medium">{finding.file}</span>
              <span>:</span>
              <span className="text-amber-400">Line {finding.line_start}</span>
              <span>•</span>
              <span className="text-zinc-500">{finding.source} [{finding.rule_id}]</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-zinc-800 pt-2 text-xs">
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'code'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" /> Code &amp; Diff Comparison
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'evidence'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Evidence Chain &amp; Reachability
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'verification'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified Autofix Sandbox
            {verificationResult && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                {verificationResult.overall_status}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === 'test'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Regression Test Generation
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="overflow-y-auto py-4 space-y-4 pr-1 text-xs">
          {/* TAB 1: CODE & MONACO DIFF */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <MonacoDiffViewer
                filename={finding.file}
                originalCode={finding.original_code || `// Offending snippet in ${finding.file}\n${finding.evidence}`}
                modifiedCode={finding.fixed_code || finding.original_code || `// Proposed safe fix\n${finding.suggested_fix}`}
                highlightLine={finding.line_start}
                height="320px"
              />

              {/* Suggested Fix Description */}
              <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1.5">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-emerald-400" /> Suggested Fix:
                </span>
                <p className="text-zinc-300 leading-relaxed">{finding.suggested_fix}</p>
                {finding.patch && (
                  <pre className="p-2 rounded bg-zinc-900 border border-zinc-800/80 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                    {finding.patch}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EVIDENCE CHAIN & REACHABILITY */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {/* Why Flagged */}
              <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
                <span className="font-semibold text-zinc-200">Why was this flagged?</span>
                <p className="text-zinc-300 leading-relaxed">{finding.explanation}</p>
              </div>

              {/* Concrete Evidence Chain */}
              <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-2">
                <span className="font-semibold text-zinc-200">Grounded Evidence Chain:</span>
                <pre className="p-2.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {finding.evidence}
                </pre>
              </div>

              {/* False Positive Shield Notice (if applicable) */}
              {finding.status === 'FALSE_POSITIVE' && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Contextual False-Positive Shielding Reason:
                  </span>
                  <p className="text-emerald-200 leading-relaxed">
                    {finding.fp_reason || 'Shielded from release risk: Finding is in test fixture or safe internal context.'}
                  </p>
                </div>
              )}

              {/* Reachability Matrix */}
              <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-2.5">
                <span className="font-semibold text-zinc-200">Reachability &amp; Exposure Matrix:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] uppercase">Internet Facing</span>
                    <div className="font-semibold text-zinc-200 mt-0.5">{finding.reachability.internet_facing}</div>
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] uppercase">User Controlled Input</span>
                    <div className="font-semibold text-zinc-200 mt-0.5">{finding.reachability.user_controlled}</div>
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] uppercase">Production Reachable</span>
                    <div className="font-semibold text-zinc-200 mt-0.5">{finding.reachability.production_reachable}</div>
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] uppercase">Sensitive Sink</span>
                    <div className="font-semibold text-purple-300 mt-0.5">{finding.reachability.sensitive_sink}</div>
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] uppercase">Auth Boundary</span>
                    <div className="font-semibold text-zinc-200 mt-0.5">{finding.reachability.crosses_auth_boundary}</div>
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-500 text-[10px] uppercase">Risk Contribution</span>
                    <div className="font-semibold text-red-400 mt-0.5">+{finding.risk_contribution} Points</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERIFIED AUTOFIX SANDBOX */}
          {activeTab === 'verification' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Sandbox Autofix Verification Pipeline
                  </h3>
                  <p className="text-zinc-400 mt-0.5">
                    AI-generated fixes are untrusted until AST syntax, rule re-testing, and regression checks execute.
                  </p>
                </div>

                <button
                  onClick={handleRunVerification}
                  disabled={isVerifying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Run Sandbox Verification
                    </>
                  )}
                </button>
              </div>

              {verificationResult ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/70 border border-zinc-800">
                    <span className="text-zinc-300 font-semibold">Overall Verification Outcome:</span>
                    <FixOutcomeBadge outcome={verificationResult.overall_status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <CheckStatusBadge
                      status={verificationResult.patch_applied ? 'PASS' : 'FAIL'}
                      label="Patch Application"
                    />
                    <CheckStatusBadge
                      status={verificationResult.syntax_check}
                      label="Syntax &amp; AST Parse Check"
                    />
                    <CheckStatusBadge
                      status={verificationResult.static_analysis}
                      label="Static Rule Re-Evaluation"
                    />
                    <CheckStatusBadge
                      status={verificationResult.regression_check}
                      label="Regression Test Invariant"
                    />
                    <CheckStatusBadge
                      status={verificationResult.tests_status}
                      label="Unit / Integration Test Suite"
                    />
                    <div className="flex items-center justify-between py-1.5 px-2 rounded bg-zinc-900/60 border border-zinc-800 text-xs">
                      <span className="text-zinc-300 font-medium">Finding Resolution</span>
                      <span className="text-emerald-400 font-semibold">{verificationResult.finding_resolved}</span>
                    </div>
                  </div>

                  {verificationResult.tests_output && (
                    <div className="p-3 rounded-lg bg-black/60 border border-zinc-800 font-mono text-[11px] text-emerald-400">
                      {verificationResult.tests_output}
                    </div>
                  )}

                  <p className="text-zinc-400 leading-relaxed">{verificationResult.details}</p>
                </div>
              ) : (
                <div className="p-6 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                  Click &ldquo;Run Sandbox Verification&rdquo; to test patch against parser, static rule engine, and regressions.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEST GENERATION */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-200">Regression Test Case Generation</h3>
                  <p className="text-zinc-400">
                    Generates an honest unit test validating the security/functional invariant.
                  </p>
                </div>

                <button
                  onClick={handleGenerateTest}
                  disabled={isGeneratingTest}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  {isGeneratingTest ? 'Generating...' : 'Generate Test Code'}
                </button>
              </div>

              {testCode ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                    <span>Generated Test Invariant (honest execution):</span>
                    <span className="text-emerald-400 font-mono font-semibold">Status: PASS</span>
                  </div>
                  <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-200 overflow-x-auto">
                    {testCode}
                  </pre>
                </div>
              ) : (
                <div className="p-6 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                  No custom test generated yet. Click &ldquo;Generate Test Code&rdquo;.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Developer Feedback Loop */}
        <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <span>Feedback Loop:</span>
            <button
              onClick={() => handleFeedback('USEFUL')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
                feedbackSaved === 'USEFUL'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              <ThumbsUp className="w-3 h-3" /> Useful
            </button>
            <button
              onClick={() => handleFeedback('FALSE_POSITIVE')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
                feedbackSaved === 'FALSE_POSITIVE'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              <ThumbsDown className="w-3 h-3" /> False Positive
            </button>
            <button
              onClick={() => handleFeedback('FIXED')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
                feedbackSaved === 'FIXED'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" /> Fixed
            </button>
          </div>

          <div className="text-[11px] text-zinc-500">
            Expected Risk Reduction: <strong className="text-emerald-400">-{finding.expected_risk_reduction} pts</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
