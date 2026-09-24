import React, { useState } from 'react';
import { AnalysisRun } from '../../types';
import {
  ShieldAlert,
  Terminal,
  Activity,
  FileText,
  ChevronDown,
  Sparkles,
  Server,
} from 'lucide-react';
import { ReportModal } from '../common/ReportModal';

interface NavbarProps {
  currentRun: AnalysisRun;
  onSelectDemo: (scenarioId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRun, onSelectDemo }) => {
  const [showReport, setShowReport] = useState(false);
  const [showHealthPopover, setShowHealthPopover] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
        {/* App Title & Active PR */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-zinc-100 tracking-tight">
                  AI Code Review &amp; Release-Risk Assistant
                </span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
                  HTH-GA-06
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-zinc-800 text-xs text-zinc-400">
            <span>Analyzing:</span>
            <span className="font-mono text-zinc-200 font-medium">{currentRun.pr.repository}</span>
            <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 font-mono text-zinc-300">
              PR #{currentRun.pr.pr_number}
            </span>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Quick Demo PR Switcher */}
          <div className="relative">
            <select
              value={currentRun.pr.id.includes('demo-') ? currentRun.pr.id.split('-').slice(0, 2).join('-') : 'custom'}
              onChange={(e) => onSelectDemo(e.target.value)}
              className="appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 pl-2.5 pr-8 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="demo-1">Demo 1: SQL Injection (Payment)</option>
              <option value="demo-2">Demo 2: Auth Bypass (JWT)</option>
              <option value="demo-3">Demo 3: N+1 Perf Loop (Reports)</option>
              <option value="demo-4">Demo 4: Null Dereference (Order)</option>
              <option value="demo-5">Demo 5: Mixed Security + CVE Downgrade</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Mode Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              currentRun.mode === 'DEMO'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            }`}
            title={
              currentRun.mode === 'DEMO'
                ? 'Deterministic Demo Engine (Zero Paid API Required)'
                : 'Connected to Local Ollama Coding Model'
            }
          >
            <span className={`w-1.5 h-1.5 rounded-full ${currentRun.mode === 'DEMO' ? 'bg-purple-400' : 'bg-emerald-400'} animate-pulse`} />
            {currentRun.mode === 'DEMO' ? '● DEMO MODE' : '● LOCAL AI'}
          </div>

          {/* System Health Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowHealthPopover(!showHealthPopover)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-xs text-zinc-300 transition-colors"
              title="System & Analyzer Status"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Engine Health</span>
            </button>

            {showHealthPopover && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-zinc-900 border border-zinc-800 p-3 shadow-xl z-50 text-xs space-y-2.5">
                <div className="flex items-center justify-between font-semibold text-zinc-200 border-b border-zinc-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-400" /> System Analyzers
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase">Status</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Semgrep (Security AST)</span>
                    <span className="text-emerald-400 font-semibold">Active</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Bandit (Python AST)</span>
                    <span className="text-emerald-400 font-semibold">Active</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>Ruff (Fast Linter)</span>
                    <span className="text-emerald-400 font-semibold">Active</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>ESLint (JS/TS Engine)</span>
                    <span className="text-emerald-400 font-semibold">Active</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300 border-t border-zinc-800 pt-1.5">
                    <span>AI Provider</span>
                    <span className="text-purple-400 font-mono text-[11px]">
                      {currentRun.mode === 'DEMO' ? 'DemoEngine (Offline)' : 'Ollama Local'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audit Report Button */}
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Audit Report</span>
          </button>
        </div>
      </header>

      {showReport && <ReportModal run={currentRun} onClose={() => setShowReport(false)} />}
    </>
  );
};
