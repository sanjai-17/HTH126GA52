import React from 'react';
import { AnalysisRun } from '../../types';
import { Shield, FileText } from 'lucide-react';
import { ActionButton } from '../common/ActionButton';
import { ReportModal } from '../common/ReportModal';

interface TopBarProps {
  currentRun: AnalysisRun | null;
  onSelectDemo?: (scenarioId: string) => void;
  onAnalyzeNewPR?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentRun,
  onSelectDemo,
  onAnalyzeNewPR,
}) => {
  const [showReport, setShowReport] = React.useState(false);

  return (
    <>
      <header className="h-13 border-b border-[#1F2D3D] bg-[#0B1117] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
        {/* Left: Brand & PR Context */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-5 h-5 rounded bg-[#111923] border border-[#1F2D3D] flex items-center justify-center text-[#B8F34A]">
              <Shield className="w-3 h-3 text-[#B8F34A]" />
            </div>
            <span className="font-semibold text-xs tracking-wider text-[#F0F6FC]">
              CODEGUARD
            </span>
          </div>

          {currentRun && (
            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-[#1F2D3D] text-xs text-[#8B949E] truncate">
              <span className="text-[#F0F6FC] font-medium">{currentRun.pr.repository}</span>
              <span className="text-[#8B949E] font-mono">#{currentRun.pr.pr_number}</span>
              <span className="text-[#586069]">•</span>
              <span className="text-[#8B949E] truncate max-w-sm">{currentRun.pr.title}</span>
            </div>
          )}
        </div>

        {/* Right: Actions & Demo Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Subtle Demo selector if in demo mode */}
          {onSelectDemo && currentRun && currentRun.mode === 'DEMO' && (
            <div className="hidden md:flex items-center gap-1.5">
              <select
                value={
                  currentRun.pr.id.includes('demo-')
                    ? currentRun.pr.id.split('-').slice(0, 2).join('-')
                    : 'custom'
                }
                onChange={(e) => onSelectDemo(e.target.value)}
                className="bg-[#111923] border border-[#1F2D3D] hover:border-[#2A3A4D] text-[11px] text-[#8B949E] hover:text-[#F0F6FC] px-2 py-1 rounded cursor-pointer focus:outline-none"
              >
                <option value="demo-1">Demo 1: SQL Injection</option>
                <option value="demo-2">Demo 2: Auth Bypass</option>
                <option value="demo-3">Demo 3: N+1 Perf Loop</option>
                <option value="demo-4">Demo 4: Null Dereference</option>
                <option value="demo-5">Demo 5: CVE Downgrade</option>
              </select>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#111923] text-[#586069] border border-[#1F2D3D]">
                Demo
              </span>
            </div>
          )}

          {/* Audit report export button */}
          {currentRun && (
            <button
              onClick={() => setShowReport(true)}
              className="hidden lg:inline-flex items-center gap-1.5 px-2 py-1 text-xs text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
              title="View release audit report"
            >
              <FileText className="w-3.5 h-3.5 text-[#586069]" />
              <span>Report</span>
            </button>
          )}

          {/* Primary Action Button */}
          {onAnalyzeNewPR && (
            <ActionButton
              variant="primary"
              size="sm"
              onClick={onAnalyzeNewPR}
            >
              Analyze PR
            </ActionButton>
          )}
        </div>
      </header>

      {showReport && currentRun && (
        <ReportModal run={currentRun} onClose={() => setShowReport(false)} />
      )}
    </>
  );
};
