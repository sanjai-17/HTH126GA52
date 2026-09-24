import React, { useState, useEffect } from 'react';
import { fetchSettings, fetchHealthStatus, fetchReleasePolicy, updateReleasePolicyConfig } from '../services/api';
import { ReleasePolicy } from '../types';
import { Check } from 'lucide-react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [policy, setPolicy] = useState<ReleasePolicy>({
    id: 'policy-default',
    repository_id: 'default',
    risk_budget: 40,
    max_critical_security: 0,
    max_high_security: 0,
    require_verified_fixes: true,
    require_tests_passed: true,
    updated_at: new Date().toISOString(),
  });
  const [policySaved, setPolicySaved] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const loadData = async () => {
    try {
      const [settingsData, policyData] = await Promise.all([
        fetchSettings(),
        fetchReleasePolicy(),
      ]);
      setSettings(settingsData);
      if (policyData) setPolicy(policyData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const health = await fetchHealthStatus();
      if (health.ollama?.online) {
        setTestResult(
          `Connected to Ollama at ${health.ollama.url} (${health.ollama.latencyMs}ms). Active models: ${health.ollama.availableModels.join(', ') || 'default'}`
        );
      } else {
        setTestResult(
          `Local Ollama daemon not responding at ${health.ollama?.url || 'http://localhost:11434'}. Demo mode is active.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult(`Connection test error: ${msg}. Demo mode active.`);
    } finally {
      setTesting(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      const updated = await updateReleasePolicyConfig(policy);
      setPolicy(updated);
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPolicy(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-7 py-2 text-xs text-[#F0F6FC]">
      <div className="border-b border-[#1F2D3D] pb-4 select-none">
        <h1 className="text-xl font-semibold tracking-tight text-[#F0F6FC]">
          Settings
        </h1>
        <p className="text-xs text-[#8B949E] mt-1">
          Configuration for local model endpoints, static analyzers, and release policies.
        </p>
      </div>

      {/* 1. RELEASE RISK POLICY & BUDGET (INNOVATION FEATURE 3) */}
      <form onSubmit={handleSavePolicy} className="space-y-3.5">
        <div className="flex items-baseline justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[#F0F6FC]">
              Repository release policy &amp; budget
            </h2>
            <p className="text-xs text-[#8B949E]">
              Policy gates evaluated deterministically before approving a pull request.
            </p>
          </div>
          {policySaved && (
            <span className="text-[11px] font-mono text-[#3FB950] flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        <div className="p-4 rounded border border-[#1F2D3D] bg-[#111923] space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label className="text-[#8B949E]">Maximum acceptable risk score (budget)</label>
              <span className="font-mono font-semibold text-[#B8F34A]">{policy.risk_budget} / 100</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={policy.risk_budget}
              onChange={(e) => setPolicy({ ...policy, risk_budget: parseInt(e.target.value, 10) })}
              className="w-full accent-[#B8F34A] cursor-pointer"
            />
            <p className="text-[11px] text-[#586069] mt-1">
              Releases exceeding {policy.risk_budget} are marked OVER BUDGET and trigger the Minimum Safe Patch optimizer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[#8B949E] block mb-1">Max critical security findings</label>
              <input
                type="number"
                min="0"
                max="5"
                value={policy.max_critical_security}
                onChange={(e) => setPolicy({ ...policy, max_critical_security: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-2 rounded bg-[#0B1117] border border-[#1F2D3D] text-[#F0F6FC] font-mono"
              />
            </div>
            <div>
              <label className="text-[#8B949E] block mb-1">Max high security findings</label>
              <input
                type="number"
                min="0"
                max="10"
                value={policy.max_high_security}
                onChange={(e) => setPolicy({ ...policy, max_high_security: parseInt(e.target.value, 10) || 0 })}
                className="w-full p-2 rounded bg-[#0B1117] border border-[#1F2D3D] text-[#F0F6FC] font-mono"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1 border-t border-[#1F2D3D]">
            <label className="flex items-center gap-2 text-[#8B949E] cursor-pointer">
              <input
                type="checkbox"
                checked={policy.require_verified_fixes}
                onChange={(e) => setPolicy({ ...policy, require_verified_fixes: e.target.checked })}
                className="accent-[#B8F34A] rounded"
              />
              <span>Require verified fixes for all must-fix findings before merge</span>
            </label>
            <label className="flex items-center gap-2 text-[#8B949E] cursor-pointer">
              <input
                type="checkbox"
                checked={policy.require_tests_passed}
                onChange={(e) => setPolicy({ ...policy, require_tests_passed: e.target.checked })}
                className="accent-[#B8F34A] rounded"
              />
              <span>Require all security invariant &amp; regression tests to pass</span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPolicy}
              className="px-3.5 py-1.5 rounded bg-[#B8F34A] hover:bg-[#C6F764] text-[#0B1117] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingPolicy ? 'Saving...' : 'Save policy'}
            </button>
          </div>
        </div>
      </form>

      <div className="border-t border-[#1F2D3D]" />

      {/* 2. AI PROVIDER */}
      <div className="space-y-3.5">
        <h2 className="text-sm font-semibold text-[#F0F6FC]">
          AI provider
        </h2>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[#8B949E] block mb-1">Provider</label>
              <input
                type="text"
                disabled
                value="Ollama"
                className="w-full p-2 rounded bg-[#111923] border border-[#1F2D3D] text-[#F0F6FC] font-mono"
              />
            </div>
            <div>
              <label className="text-[#8B949E] block mb-1">Model</label>
              <input
                type="text"
                disabled
                value={settings?.ollama_model || 'qwen2.5-coder:7b'}
                className="w-full p-2 rounded bg-[#111923] border border-[#1F2D3D] text-[#F0F6FC] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[#8B949E] block mb-1">Endpoint</label>
            <input
              type="text"
              disabled
              value={settings?.ollama_base_url || 'http://localhost:11434'}
              className="w-full p-2 rounded bg-[#111923] border border-[#1F2D3D] text-[#F0F6FC] font-mono"
            />
          </div>

          <div className="pt-1">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3 py-1.5 rounded bg-[#111923] hover:bg-[#17212B] text-[#F0F6FC] font-medium transition-colors border border-[#1F2D3D] hover:border-[#2A3A4D] disabled:opacity-50 cursor-pointer"
            >
              {testing ? 'Testing...' : 'Test connection'}
            </button>
          </div>

          {testResult && (
            <div className="p-2.5 rounded bg-[#111923] border border-[#1F2D3D] font-mono text-[11px] text-[#8B949E]">
              {testResult}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 3. STATIC ANALYSIS */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#F0F6FC]">
          Static analysis
        </h2>

        <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D]">
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-mono text-[#F0F6FC]">Semgrep</span>
            <span className="text-[#B8F34A] font-mono text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8F34A]" />
              Connected
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-mono text-[#F0F6FC]">Bandit</span>
            <span className="text-[#B8F34A] font-mono text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8F34A]" />
              Connected
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-mono text-[#F0F6FC]">Ruff</span>
            <span className="text-[#B8F34A] font-mono text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8F34A]" />
              Connected
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <span className="font-mono text-[#F0F6FC]">ESLint</span>
            <span className="text-[#B8F34A] font-mono text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8F34A]" />
              Connected
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#1F2D3D]" />

      {/* 4. RISK THRESHOLDS */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[#F0F6FC]">
          Risk thresholds
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-center">
          <div className="p-2.5 rounded bg-[#111923] border border-[#1F2D3D]">
            <div className="text-[11px] text-[#3FB950]">Low</div>
            <div className="text-sm font-medium text-[#F0F6FC] mt-0.5">0–20</div>
          </div>
          <div className="p-2.5 rounded bg-[#111923] border border-[#1F2D3D]">
            <div className="text-[11px] text-[#38BDF8]">Moderate</div>
            <div className="text-sm font-medium text-[#F0F6FC] mt-0.5">21–40</div>
          </div>
          <div className="p-2.5 rounded bg-[#111923] border border-[#1F2D3D]">
            <div className="text-[11px] text-[#FFB547]">Elevated</div>
            <div className="text-sm font-medium text-[#F0F6FC] mt-0.5">41–60</div>
          </div>
          <div className="p-2.5 rounded bg-[#111923] border border-[#1F2D3D]">
            <div className="text-[11px] text-[#FB923C]">High</div>
            <div className="text-sm font-medium text-[#F0F6FC] mt-0.5">61–80</div>
          </div>
          <div className="p-2.5 rounded bg-[#111923] border border-[#1F2D3D]">
            <div className="text-[11px] text-[#FF5C5C]">Critical</div>
            <div className="text-sm font-medium text-[#F0F6FC] mt-0.5">81–100</div>
          </div>
        </div>
      </div>
    </div>
  );
};
