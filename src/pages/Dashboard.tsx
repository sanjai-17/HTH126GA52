import React from 'react';
import { AnalysisRun, NormalizedFinding } from '../types';
import { RiskGauge } from '../components/common/RiskGauge';
import { SeverityBadge, CategoryBadge } from '../components/common/SeverityBadge';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  ArrowRight,
  TrendingDown,
  Layers,
  Flame,
  FileText,
  Clock,
} from 'lucide-react';

interface DashboardProps {
  run: AnalysisRun;
  onSelectFinding: (finding: NormalizedFinding) => void;
  onNavigate: (page: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ run, onSelectFinding, onNavigate }) => {
  // Count severity for actionable findings
  const actionable = run.findings.filter((f) => f.status !== 'FALSE_POSITIVE');
  const criticalCount = actionable.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = actionable.filter((f) => f.severity === 'HIGH').length;
  const mediumCount = actionable.filter((f) => f.severity === 'MEDIUM').length;
  const lowCount = actionable.filter((f) => f.severity === 'LOW').length;

  return (
    <div className="space-y-6">
      {/* Top PR Header Card */}
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-mono font-medium">
              {run.pr.repository}
            </span>
            <span className="text-xs text-zinc-400 font-mono">#{run.pr.pr_number}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400">
              Branch: <code className="text-zinc-300 font-mono">{run.pr.branch}</code> → <code className="text-zinc-300 font-mono">{run.pr.base_branch}</code>
            </span>
          </div>

          <h1 className="text-lg md:text-xl font-bold text-zinc-100 tracking-tight">
            {run.pr.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              {run.pr.author_avatar ? (
                <img src={run.pr.author_avatar} alt={run.pr.author} className="w-4 h-4 rounded-full" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-zinc-700" />
              )}
              <span className="text-zinc-300">{run.pr.author}</span>
            </div>
            <span>•</span>
            <span>{run.pr.files_changed} files changed</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">+{run.pr.lines_added}</span>
            <span className="text-rose-400 font-mono">-{run.pr.lines_deleted}</span>
            <span>•</span>
            <span className="text-zinc-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Release Risk Score Gauge */}
        <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 shrink-0">
          <RiskGauge risk={run.risk} size="md" />
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Critical</span>
          <span className="text-2xl font-bold font-mono text-red-400 mt-1">{criticalCount}</span>
          <span className="text-[10px] text-zinc-400 mt-1">Release blockers</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">High Risk</span>
          <span className="text-2xl font-bold font-mono text-orange-400 mt-1">{highCount}</span>
          <span className="text-[10px] text-zinc-400 mt-1">Must fix prioritized</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Medium</span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-1">{mediumCount}</span>
          <span className="text-[10px] text-zinc-400 mt-1">Quality / reliability</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Low / Style</span>
          <span className="text-2xl font-bold font-mono text-blue-400 mt-1">{lowCount}</span>
          <span className="text-[10px] text-zinc-400 mt-1">Minor observations</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Shielded FP
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1">{run.false_positives_count}</span>
          <span className="text-[10px] text-zinc-400 mt-1">Noise eliminated</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Blast Radius
          </span>
          <span className="text-2xl font-bold font-mono text-zinc-200 mt-1">{run.blast_radius.level}</span>
          <span className="text-[10px] text-zinc-400 mt-1">{run.blast_radius.files_affected} files affected</span>
        </div>
      </div>

      {/* Main Two-Column Layout: Top 3 Must-Fix + Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Top 3 Must-Fix (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                Top-3 Must-Fix Issues
              </h2>
            </div>
            <button
              onClick={() => onNavigate('findings')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
            >
              View all ({run.actionable_findings_count}) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {run.top_3_must_fix.map((finding, idx) => (
              <div
                key={finding.id}
                onClick={() => onSelectFinding(finding)}
                className="group p-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer shadow-sm relative overflow-hidden"
              >
                {/* Accent line */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    finding.severity === 'CRITICAL'
                      ? 'bg-red-500'
                      : finding.severity === 'HIGH'
                      ? 'bg-orange-500'
                      : 'bg-amber-500'
                  }`}
                />

                <div className="pl-2 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-400">#{idx + 1}</span>
                        <SeverityBadge severity={finding.severity} />
                        <CategoryBadge category={finding.category} />
                        <span className="text-[11px] font-mono text-zinc-400">{finding.file}:{finding.line_start}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                        {finding.title}
                      </h3>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-xs font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        +{finding.risk_contribution} Risk
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-1 font-mono">
                        {(finding.confidence * 100).toFixed(0)}% Confidence
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {finding.why_prioritized || finding.explanation}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[11px] text-zinc-400">
                    <div className="flex items-center gap-3">
                      <span>Reachability: <strong className="text-zinc-200">{finding.reachability.production_reachable}</strong></span>
                      <span>Sensitive Sink: <strong className="text-zinc-200">{finding.reachability.sensitive_sink}</strong></span>
                    </div>
                    <span className="text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Inspect &amp; Verify Fix <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Risk Breakdown & Pipeline Health (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Risk Contribution Breakdown */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-indigo-400" />
                Risk Factor Contribution
              </h2>
              <button
                onClick={() => onNavigate('risk')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                Simulator <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Deterministic additive points mapped directly from actionable findings:
            </p>

            <div className="space-y-2.5 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300 font-medium">Security Vulnerabilities</span>
                  <span className="font-mono font-semibold text-purple-400">+{run.risk.breakdown.security}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (run.risk.breakdown.security / 45) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300 font-medium">Functional Bugs</span>
                  <span className="font-mono font-semibold text-rose-400">+{run.risk.breakdown.bugs}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (run.risk.breakdown.bugs / 30) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300 font-medium">Performance Inefficiencies</span>
                  <span className="font-mono font-semibold text-cyan-400">+{run.risk.breakdown.performance}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, (run.risk.breakdown.performance / 20) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300 font-medium">Blast Radius Exposure</span>
                  <span className="font-mono font-semibold text-indigo-400">+{run.risk.breakdown.blast_radius}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (run.risk.breakdown.blast_radius / 15) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300 font-medium">Dependency Vulnerabilities</span>
                  <span className="font-mono font-semibold text-yellow-400">+{run.risk.breakdown.dependency}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, (run.risk.breakdown.dependency / 15) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Pipeline Health */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Analysis Pipeline Execution
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 px-2.5 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-300">Static Analyzers (Semgrep/Bandit/Ruff/ESLint)</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">✓ Complete</span>
              </div>
              <div className="flex items-center justify-between py-1 px-2.5 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-300">Contextual False-Positive Shield</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">✓ Verified</span>
              </div>
              <div className="flex items-center justify-between py-1 px-2.5 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-300">Deterministic Release-Risk Engine</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">✓ Computed</span>
              </div>
              <div className="flex items-center justify-between py-1 px-2.5 rounded bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-zinc-300">Autofix Sandbox Verification</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">✓ Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Changed Files Table */}
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-sky-400" />
          Changed Files in Pull Request ({run.pr.files.length})
        </h2>
        <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/40">
          {run.pr.files.map((file, i) => {
            const fileFindings = run.findings.filter((f) => f.file === file.filename);
            const hasActionable = fileFindings.some((f) => f.status !== 'FALSE_POSITIVE');

            return (
              <div
                key={i}
                className="p-3 flex items-center justify-between hover:bg-zinc-850/50 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span className="font-mono text-zinc-200 font-medium">{file.filename}</span>
                  {fileFindings.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                        hasActionable
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {fileFindings.length} {fileFindings.length === 1 ? 'finding' : 'findings'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-mono">+{file.additions}</span>
                  <span className="text-rose-400 font-mono">-{file.deletions}</span>
                  <button
                    onClick={() => onNavigate('findings')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    View Diff
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
