import React, { useState } from 'react';
import { AnalysisRun, NormalizedFinding } from '../types';
import { FindingCard } from '../components/common/FindingCard';
import { FindingDetail } from '../components/common/FindingDetail';
import { Search, RotateCcw } from 'lucide-react';

interface FindingsProps {
  run: AnalysisRun;
  onSelectFinding: (finding: NormalizedFinding) => void;
  selectedFinding?: NormalizedFinding | null;
  onCloseDetail?: () => void;
  onFindingUpdated?: (finding: NormalizedFinding) => void;
  onSimulateRisk?: (finding: NormalizedFinding) => void;
}

export const Findings: React.FC<FindingsProps> = ({
  run,
  onSelectFinding,
  selectedFinding,
  onCloseDetail,
  onFindingUpdated,
  onSimulateRisk,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIONABLE');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredFindings = run.findings.filter((f) => {
    if (statusFilter === 'ACTIONABLE' && f.status === 'FALSE_POSITIVE') return false;
    if (statusFilter === 'MUST_FIX' && !f.is_must_fix) return false;
    if (statusFilter === 'FALSE_POSITIVE' && f.status !== 'FALSE_POSITIVE') return false;

    if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchFile = f.file.toLowerCase().includes(q);
      const matchRule = f.rule_id.toLowerCase().includes(q);
      if (!matchTitle && !matchFile && !matchRule) return false;
    }

    return true;
  });

  const activeFinding =
    (selectedFinding && filteredFindings.some((f) => f.id === selectedFinding.id)
      ? selectedFinding
      : filteredFindings.length > 0
      ? filteredFindings[0]
      : null) || null;

  const actionableCount = run.findings.filter((f) => f.status !== 'FALSE_POSITIVE').length;
  const fpCount = run.findings.filter((f) => f.status === 'FALSE_POSITIVE').length;
  const mustFixCount = run.top_3_must_fix.length;

  const handleResetFilters = () => {
    setSeverityFilter('ALL');
    setStatusFilter('ACTIONABLE');
    setSearchQuery('');
  };

  return (
    <div className="h-full w-full flex flex-col space-y-2 overflow-hidden text-[#F0F6FC]">
      {/* Calm Filter Bar */}
      <div className="border-b border-[#1F2D3D] pb-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter('ACTIONABLE')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              statusFilter === 'ACTIONABLE'
                ? 'bg-[#17212B] text-[#F0F6FC] font-medium border border-[#2A3A4D]'
                : 'text-[#8B949E] hover:text-[#F0F6FC]'
            }`}
          >
            Actionable ({actionableCount})
          </button>
          <button
            onClick={() => setStatusFilter('MUST_FIX')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              statusFilter === 'MUST_FIX'
                ? 'bg-[#17212B] text-[#F0F6FC] font-medium border border-[#2A3A4D]'
                : 'text-[#8B949E] hover:text-[#F0F6FC]'
            }`}
          >
            Must fix ({mustFixCount})
          </button>
          <button
            onClick={() => setStatusFilter('FALSE_POSITIVE')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              statusFilter === 'FALSE_POSITIVE'
                ? 'bg-[#17212B] text-[#F0F6FC] font-medium border border-[#2A3A4D]'
                : 'text-[#8B949E] hover:text-[#F0F6FC]'
            }`}
          >
            Filtered ({fpCount})
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#17212B] text-[#F0F6FC] font-medium border border-[#2A3A4D]'
                : 'text-[#8B949E] hover:text-[#F0F6FC]'
            }`}
          >
            All ({run.findings.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#111923] border border-[#1F2D3D] rounded px-2 py-1 text-xs text-[#8B949E] hover:text-[#F0F6FC] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <div className="relative w-44">
            <Search className="w-3.5 h-3.5 text-[#586069] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter findings..."
              className="w-full pl-7 pr-2 py-1 rounded bg-[#111923] border border-[#1F2D3D] text-xs text-[#F0F6FC] placeholder-[#586069] focus:outline-none focus:border-[#2A3A4D]"
            />
          </div>

          {(severityFilter !== 'ALL' || statusFilter !== 'ACTIONABLE' || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="p-1 text-[#586069] hover:text-[#8B949E] transition-colors cursor-pointer"
              title="Reset filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout: LEFT = List, CENTER + RIGHT = FindingDetail */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 overflow-hidden">
        {/* LEFT: Finding list */}
        <div className="w-full md:w-64 lg:w-72 shrink-0 border border-[#1F2D3D] rounded bg-[#0B1117] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1F2D3D] text-[11px] font-mono uppercase tracking-wider text-[#8B949E] flex items-center justify-between shrink-0 select-none">
            <span>Issues ({filteredFindings.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredFindings.length === 0 ? (
              <div className="p-6 text-center text-[#586069] text-xs">
                No issues match your filter.
              </div>
            ) : (
              filteredFindings.map((f) => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  isSelected={activeFinding?.id === f.id}
                  onSelect={() => onSelectFinding(f)}
                />
              ))
            )}
          </div>
        </div>

        {/* CENTER & RIGHT: Code Diff + Finding Explanation */}
        <div className="flex-1 min-w-0 border border-[#1F2D3D] rounded overflow-hidden bg-[#0B1117] flex flex-col">
          {activeFinding ? (
            <FindingDetail
              finding={activeFinding}
              onFindingUpdated={onFindingUpdated}
              onSimulateRisk={onSimulateRisk}
              onClose={onCloseDetail}
            />
          ) : (
            <div className="p-12 text-center text-[#586069] text-xs m-auto">
              Select an issue from the list to inspect code and details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
