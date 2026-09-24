import React, { useState } from 'react';
import { AnalysisRun } from '../types';
import { analyzePRUrl, analyzeDiffText, fetchDemoAnalysis } from '../services/api';
import { ActionButton } from '../components/common/ActionButton';
import { ProgressPipeline, PipelineStep } from '../components/common/ProgressPipeline';
import { ErrorState } from '../components/common/ErrorState';
import { ArrowRight, GitPullRequest, UploadCloud, Play } from 'lucide-react';

interface AnalyzePRProps {
  onAnalysisComplete: (run: AnalysisRun) => void;
  onNavigate: (page: any) => void;
}

export const AnalyzePR: React.FC<AnalyzePRProps> = ({ onAnalysisComplete, onNavigate }) => {
  const [method, setMethod] = useState<'url' | 'diff' | 'demo'>('url');
  const [prUrl, setPrUrl] = useState('');
  const [diffText, setDiffText] = useState('');
  const [diffFilename, setDiffFilename] = useState('payment_handler.py');
  const [selectedDemoId, setSelectedDemoId] = useState('demo-1');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorDetails, setErrorDetails] = useState<{ reason: string; technical?: string } | null>(null);

  const pipelineSteps: PipelineStep[] = [
    { id: 'fetch', label: 'Fetching pull request & metadata' },
    { id: 'extract', label: 'Extracting changed files & diff' },
    { id: 'ast', label: 'Running static analysis (Semgrep, Bandit, Ruff, ESLint)' },
    { id: 'normalize', label: 'Normalizing findings into DevSecOps schema' },
    { id: 'ai', label: 'Contextual code review & reachability mapping' },
    { id: 'shield', label: 'False-positive filtering' },
    { id: 'risk', label: 'Release-risk calculation & prioritization' },
    { id: 'report', label: 'Finalizing verification readiness' },
  ];

  const runPipeline = async (fetchTask: () => Promise<AnalysisRun>) => {
    setIsAnalyzing(true);
    setErrorDetails(null);
    setCurrentStepIndex(0);

    for (let i = 0; i < pipelineSteps.length - 2; i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      setCurrentStepIndex(i + 1);
    }

    try {
      const run = await fetchTask();
      setCurrentStepIndex(pipelineSteps.length);
      await new Promise((resolve) => setTimeout(resolve, 250));
      setIsAnalyzing(false);
      onAnalysisComplete(run);
      onNavigate('overview');
    } catch (err: unknown) {
      setIsAnalyzing(false);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorDetails({
        reason: msg.includes('GitHub') || msg.includes('token')
          ? 'GitHub authentication failed or rate limit reached. Verify token in settings or try a Demo PR.'
          : msg,
        technical: msg,
      });
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prUrl.trim()) return;
    runPipeline(() => analyzePRUrl(prUrl.trim()));
  };

  const handleDiffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diffText.trim()) return;
    runPipeline(() => analyzeDiffText(diffText.trim(), diffFilename));
  };

  const handleDemoSubmit = (scenarioId?: string) => {
    const target = scenarioId || selectedDemoId;
    runPipeline(() => fetchDemoAnalysis(target));
  };

  const demoScenarios = [
    {
      id: 'demo-1',
      name: 'PR #142 — SQL Injection in Payment Profile',
      repo: 'acme-corp/payment-service',
      tag: 'SQL injection',
    },
    {
      id: 'demo-2',
      name: 'PR #89 — JWT Algorithm Confusion & Bypass',
      repo: 'cloud-native/auth-gateway',
      tag: 'Auth bypass',
    },
    {
      id: 'demo-3',
      name: 'PR #304 — Analytics Service N+1 Performance Loop',
      repo: 'enterprise/analytics-service',
      tag: 'Performance loop',
    },
    {
      id: 'demo-4',
      name: 'PR #512 — Unchecked Null Pointer in Checkout Routing',
      repo: 'payment-core/checkout-service',
      tag: 'Null pointer',
    },
    {
      id: 'demo-5',
      name: 'PR #780 — Dependency Downgrade to Vulnerable jsonwebtoken',
      repo: 'security-lab/identity-token-service',
      tag: 'CVE downgrade',
    },
  ];

  if (isAnalyzing) {
    return (
      <div className="max-w-xl mx-auto py-12 space-y-6">
        <ProgressPipeline
          title="Analyzing pull request"
          subtitle="Running static analyzers, verifying reachability, and calculating release risk."
          steps={pipelineSteps}
          currentStepIndex={currentStepIndex}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2 text-[#F0F6FC]">
      {/* Title & Subtitle */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-[#F0F6FC]">
          Analyze a pull request
        </h1>
        <p className="text-xs text-[#8B949E]">
          Review code changes before merging.
        </p>
      </div>

      {errorDetails && (
        <ErrorState
          title="Analysis could not complete"
          reason={errorDetails.reason}
          technicalDetails={errorDetails.technical}
          onRetry={() => setErrorDetails(null)}
        />
      )}

      {/* Input Method Switcher */}
      <div className="flex border-b border-[#1F2D3D] text-xs select-none">
        <button
          onClick={() => setMethod('url')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            method === 'url'
              ? 'border-[#B8F34A] text-[#F0F6FC]'
              : 'border-transparent text-[#8B949E] hover:text-[#F0F6FC]'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span>GitHub Pull Request URL</span>
        </button>

        <button
          onClick={() => setMethod('diff')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            method === 'diff'
              ? 'border-[#B8F34A] text-[#F0F6FC]'
              : 'border-transparent text-[#8B949E] hover:text-[#F0F6FC]'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload diff</span>
        </button>

        <button
          onClick={() => setMethod('demo')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            method === 'demo'
              ? 'border-[#B8F34A] text-[#F0F6FC]'
              : 'border-transparent text-[#8B949E] hover:text-[#F0F6FC]'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Demo PR</span>
        </button>
      </div>

      {/* FORM: Method URL */}
      {method === 'url' && (
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#8B949E]">
              GitHub Pull Request URL
            </label>
            <input
              type="url"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/organization/repo/pull/142"
              className="w-full px-3 py-2 rounded bg-[#111923] border border-[#1F2D3D] text-xs text-[#F0F6FC] placeholder-[#586069] focus:outline-none focus:border-[#B8F34A] font-mono"
              required
            />
            <p className="text-[11px] text-[#586069]">
              Accepts public or authenticated private GitHub repositories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ActionButton
              type="submit"
              variant="primary"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
            >
              Analyze PR
            </ActionButton>
          </div>
        </form>
      )}

      {/* FORM: Method Diff Text */}
      {method === 'diff' && (
        <form onSubmit={handleDiffSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#8B949E]">
              Filename
            </label>
            <input
              type="text"
              value={diffFilename}
              onChange={(e) => setDiffFilename(e.target.value)}
              placeholder="e.g. services/payment.py"
              className="w-full px-3 py-2 rounded bg-[#111923] border border-[#1F2D3D] text-xs text-[#F0F6FC] font-mono focus:outline-none focus:border-[#B8F34A]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#8B949E]">
              Unified Diff or Code Snippet
            </label>
            <textarea
              rows={8}
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              placeholder="Paste git diff or raw source code changes here..."
              className="w-full p-3 rounded bg-[#111923] border border-[#1F2D3D] text-xs text-[#F0F6FC] font-mono focus:outline-none focus:border-[#B8F34A]"
              required
            />
          </div>

          <ActionButton
            type="submit"
            variant="primary"
            size="md"
          >
            Analyze diff
          </ActionButton>
        </form>
      )}

      {/* FORM: Method Demo PR */}
      {method === 'demo' && (
        <div className="space-y-3">
          <p className="text-xs text-[#8B949E]">
            Select a verified benchmark PR scenario for demonstration:
          </p>

          <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D]">
            {demoScenarios.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedDemoId(s.id);
                  handleDemoSubmit(s.id);
                }}
                className="py-3 flex items-center justify-between hover:bg-[#111923] px-2 -mx-2 rounded cursor-pointer transition-colors group"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-[#F0F6FC] group-hover:text-[#B8F34A] transition-colors">
                    {s.name}
                  </div>
                  <div className="font-mono text-[11px] text-[#586069]">
                    {s.repo}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#1F2D3D] bg-[#111923] text-[#8B949E]">
                    {s.tag}
                  </span>
                  <span className="text-xs text-[#8B949E] group-hover:text-[#B8F34A] transition-colors font-mono">
                    Run →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Analyses Footer */}
      <div className="pt-6 border-t border-[#1F2D3D]">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[#586069] mb-2 select-none">
          Recent analyses
        </h3>
        <div className="divide-y divide-[#1F2D3D] text-xs">
          <div
            onClick={() => handleDemoSubmit('demo-1')}
            className="py-2 flex items-center justify-between hover:bg-[#111923] px-2 -mx-2 rounded cursor-pointer text-[#8B949E] hover:text-[#F0F6FC]"
          >
            <span className="font-mono">acme-corp/payment-service #142</span>
            <span className="font-mono text-[11px] text-[#FFB547]">Risk: 57 / 100</span>
          </div>
          <div
            onClick={() => handleDemoSubmit('demo-5')}
            className="py-2 flex items-center justify-between hover:bg-[#111923] px-2 -mx-2 rounded cursor-pointer text-[#8B949E] hover:text-[#F0F6FC]"
          >
            <span className="font-mono">security-lab/identity-token-service #780</span>
            <span className="font-mono text-[11px] text-[#FF5C5C]">Risk: 64 / 100</span>
          </div>
        </div>
      </div>
    </div>
  );
};
