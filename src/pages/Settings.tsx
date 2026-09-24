import React, { useState, useEffect } from 'react';
import { fetchSettings, fetchHealthStatus } from '../services/api';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
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

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-7 py-2 text-xs text-[#F0F6FC]">
      <div className="border-b border-[#1F2D3D] pb-4 select-none">
        <h1 className="text-xl font-semibold tracking-tight text-[#F0F6FC]">
          Settings
        </h1>
        <p className="text-xs text-[#8B949E] mt-1">
          Configuration for local model endpoints, static analyzers, and risk calibration.
        </p>
      </div>

      {/* 1. AI PROVIDER */}
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

      {/* 2. STATIC ANALYSIS */}
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

      {/* 3. RISK THRESHOLDS */}
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
