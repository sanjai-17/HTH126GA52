import React, { useState } from 'react';
import { AnalysisRun, NormalizedFinding } from '../types';
import { analyzeStackTrace } from '../services/api';
import {
  Terminal,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileCode2,
} from 'lucide-react';

interface StackTraceProps {
  run: AnalysisRun;
  onSelectFinding: (finding: NormalizedFinding) => void;
}

export const StackTrace: React.FC<StackTraceProps> = ({ run, onSelectFinding }) => {
  const [traceText, setTraceText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traceText.trim()) return;

    setIsAnalyzing(true);
    try {
      const data = await analyzeStackTrace(traceText, run.id);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInsertSample = () => {
    setTraceText(`Traceback (most recent call last):
  File "routes/checkout.py", line 82, in handle_checkout
    profile = fetch_customer_payment_profile(user_id, request.tenant_id)
  File "services/payment.py", line 42, in fetch_customer_payment_profile
    query = f"SELECT * FROM payment_profiles WHERE tenant_id = '{tenant_id}' AND user_id = '{user_id}'"
    cursor.execute(query)
psycopg2.errors.SyntaxError: syntax error at or near "' OR '1'='1"`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          Stack Trace Root Cause Correlator
        </h1>
        <p className="text-xs text-zinc-400">
          Paste production or test failure stack traces to map runtime exceptions to exact Pull Request changes and active findings.
        </p>
      </div>

      {/* Input Form */}
      <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
        <form onSubmit={handleAnalyze} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-zinc-300">
              Paste Error Log / Stack Trace:
            </label>
            <button
              type="button"
              onClick={handleInsertSample}
              className="text-xs text-indigo-400 hover:underline"
            >
              Insert Sample Crash Trace
            </button>
          </div>

          <textarea
            rows={8}
            value={traceText}
            onChange={(e) => setTraceText(e.target.value)}
            placeholder={`File "services/payment.py", line 42, in fetch_customer_payment_profile\n  cursor.execute(query)\npsycopg2.errors.SyntaxError: syntax error`}
            className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            required
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              {isAnalyzing ? 'Mapping Trace...' : 'Map Stack Trace to PR Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Analysis Result */}
      {result && (
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-sm text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              Stack Trace Correlation Result
            </h2>
            <span className="font-mono text-xs text-zinc-400">
              Confidence: {(result.confidence * 100).toFixed(0)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] uppercase font-bold">Mapped Source File</span>
              <div className="font-mono font-semibold text-zinc-200 mt-0.5">
                {result.parsedFile || 'Unknown'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] uppercase font-bold">Line Number</span>
              <div className="font-mono font-semibold text-amber-400 mt-0.5">
                {result.parsedLine ? `Line ${result.parsedLine}` : 'N/A'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] uppercase font-bold">Exception Type</span>
              <div className="font-mono font-semibold text-red-400 mt-0.5">
                {result.exceptionType || 'Runtime Exception'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
            <span className="font-semibold text-zinc-200">Root Cause Analysis:</span>
            <p className="text-zinc-300 leading-relaxed">{result.rootCauseAnalysis}</p>
          </div>

          {result.matchedFinding && (
            <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Correlated PR Finding
                </span>
                <div className="font-semibold text-zinc-100">{result.matchedFinding.title}</div>
                <div className="text-zinc-400 text-[11px] font-mono">
                  {result.matchedFinding.file}:{result.matchedFinding.line_start}
                </div>
              </div>

              <button
                onClick={() => onSelectFinding(result.matchedFinding)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                Inspect Finding &amp; Fix <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-1">
            <span className="font-semibold text-zinc-200">Suggested Mitigation:</span>
            <p className="text-zinc-300 leading-relaxed">{result.suggestedMitigation}</p>
          </div>
        </div>
      )}
    </div>
  );
};
