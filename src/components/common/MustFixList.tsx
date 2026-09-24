import React from 'react';
import { NormalizedFinding } from '../../types';
import { SeverityBadge } from './SeverityBadge';

interface MustFixListProps {
  findings: NormalizedFinding[];
  onSelectFinding: (finding: NormalizedFinding) => void;
  onViewAll?: () => void;
  totalFindingsCount?: number;
}

export const MustFixList: React.FC<MustFixListProps> = ({
  findings,
  onSelectFinding,
  onViewAll,
  totalFindingsCount,
}) => {
  if (findings.length === 0) {
    return (
      <div className="py-4 text-xs text-[#8B949E]">
        No release blockers identified. All static checks passed.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#F0F6FC]">
          Fix before merging
        </h2>
        {onViewAll && totalFindingsCount !== undefined && (
          <button
            onClick={onViewAll}
            className="text-xs text-[#8B949E] hover:text-[#B8F34A] transition-colors cursor-pointer"
          >
            <span>View all {totalFindingsCount} issues →</span>
          </button>
        )}
      </div>

      <div className="divide-y divide-[#1F2D3D] border-y border-[#1F2D3D]">
        {findings.map((f) => {
          return (
            <div
              key={f.id}
              onClick={() => onSelectFinding(f)}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#111923] px-2 -mx-2 rounded transition-colors cursor-pointer group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={f.severity} size="sm" />
                  <span className="text-xs font-medium text-[#F0F6FC] group-hover:text-[#B8F34A] transition-colors truncate">
                    {f.title}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-[#8B949E]">
                  {f.file}:{f.line_start}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-xs font-mono">
                <span className="text-[#FFB547]">+{f.risk_contribution} risk</span>
                <span className="text-[11px] px-2 py-0.5 rounded border border-[#1F2D3D] bg-[#17212B] text-[#8B949E] group-hover:text-[#0B1117] group-hover:bg-[#B8F34A] group-hover:border-[#B8F34A] transition-all">
                  Review
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
