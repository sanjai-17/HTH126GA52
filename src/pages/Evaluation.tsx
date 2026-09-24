import React, { useState, useEffect } from 'react';
import { OverallEvaluationMetrics } from '../types';
import { fetchEvaluationMetrics, runEvaluation } from '../services/api';
import { RefreshCw } from 'lucide-react';

export const Evaluation: React.FC = () => {
  const [metrics, setMetrics] = useState<OverallEvaluationMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvaluationMetrics();
      setMetrics(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runEvaluation();
      setMetrics(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2 text-[#F0F6FC]">
      {/* Title & Action */}
      <div className="flex items-baseline justify-between border-b border-[#1F2D3D] pb-4 select-none">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-[#F0F6FC]">
            Evaluation
          </h1>
          <p className="text-xs text-[#8B949E]">
            Benchmark results against ground-truth pull request datasets.
          </p>
        </div>

        <button
          onClick={handleRerun}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#111923] hover:bg-[#17212B] disabled:opacity-50 text-xs text-[#8B949E] hover:text-[#F0F6FC] font-medium transition-colors border border-[#1F2D3D] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-run benchmarks</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 text-xs text-[#FF5C5C]">
          {error}
        </div>
      )}

      {loading && !metrics ? (
        <div className="py-12 text-center text-[#586069] text-xs space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#8B949E]" />
          <p>Running evaluation against benchmark suite...</p>
        </div>
      ) : metrics ? (
        <div className="space-y-6 text-xs">
          {/* 1. Benchmark Results Table */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[#F0F6FC]">
              Benchmark performance
            </h2>

            <div className="border border-[#1F2D3D] rounded overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-[#111923] border-b border-[#1F2D3D] text-[#8B949E] font-medium text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Metric</th>
                    <th className="py-2 px-3">Formula</th>
                    <th className="py-2 px-3 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2D3D] text-[#8B949E]">
                  <tr>
                    <td className="py-2 px-3 font-medium text-[#F0F6FC]">Precision</td>
                    <td className="py-2 px-3 font-mono text-[#586069] text-[11px]">TP / (TP + FP)</td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-[#B8F34A]">
                      {metrics.overall_precision}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[#F0F6FC]">Recall</td>
                    <td className="py-2 px-3 font-mono text-[#586069] text-[11px]">TP / (TP + FN)</td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-[#B8F34A]">
                      {metrics.overall_recall}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[#F0F6FC]">F1 Score</td>
                    <td className="py-2 px-3 font-mono text-[#586069] text-[11px]">2 × (P × R) / (P + R)</td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-[#B8F34A]">
                      {metrics.overall_f1}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[#F0F6FC]">Localization accuracy</td>
                    <td className="py-2 px-3 font-mono text-[#586069] text-[11px]">Exact line-span match</td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-[#F0F6FC]">
                      {metrics.avg_localization_accuracy}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-[#F0F6FC]">False-positive reduction</td>
                    <td className="py-2 px-3 font-mono text-[#586069] text-[11px]">Non-production noise filtered</td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-[#F0F6FC]">
                      {metrics.avg_fp_reduction_rate}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Confusion Counts */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[#F0F6FC]">
              Detection classification
            </h2>
            <div className="grid grid-cols-3 gap-3 border border-[#1F2D3D] rounded p-3 text-center bg-[#111923]/40">
              <div>
                <div className="text-[11px] text-[#586069]">True positives</div>
                <div className="text-xl font-mono font-semibold text-[#F0F6FC] mt-0.5">
                  {metrics.total_tp}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#586069]">False positives</div>
                <div className="text-xl font-mono font-semibold text-[#F0F6FC] mt-0.5">
                  {metrics.total_fp}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#586069]">False negatives</div>
                <div className="text-xl font-mono font-semibold text-[#F0F6FC] mt-0.5">
                  {metrics.total_fn}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Benchmark Dataset Table */}
          {metrics.scenarios && metrics.scenarios.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[#F0F6FC]">
                Ground truth scenarios ({metrics.scenarios.length})
              </h2>

              <div className="border border-[#1F2D3D] rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111923] border-b border-[#1F2D3D] text-[#8B949E] font-medium text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Scenario</th>
                      <th className="py-2 px-3 text-right">Precision</th>
                      <th className="py-2 px-3 text-right">Recall</th>
                      <th className="py-2 px-3 text-right">F1</th>
                      <th className="py-2 px-3 text-right">FP Shield</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2D3D] text-[#8B949E]">
                    {metrics.scenarios.map((s) => (
                      <tr key={s.scenario_id} className="hover:bg-[#111923]/50">
                        <td className="py-2 px-3 font-medium text-[#F0F6FC]">{s.scenario_name}</td>
                        <td className="py-2 px-3 text-right font-mono text-[#F0F6FC]">{s.precision}%</td>
                        <td className="py-2 px-3 text-right font-mono text-[#F0F6FC]">{s.recall}%</td>
                        <td className="py-2 px-3 text-right font-mono text-[#F0F6FC]">{s.f1_score}</td>
                        <td className="py-2 px-3 text-right font-mono text-[#B8F34A]">{s.fp_shield_reduction_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
