import React from 'react';
import { NormalizedFinding } from '../../types';
import { SeverityBadge } from './SeverityBadge';

interface FindingCardProps {
  finding: NormalizedFinding;
  isSelected?: boolean;
  onSelect: () => void;
  showRiskPoints?: boolean;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  isSelected = false,
  onSelect,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`p-2.5 rounded transition-all cursor-pointer space-y-1 select-none ${
        isSelected
          ? 'bg-[#17212B] border-l-2 border-l-[#B8F34A] border border-[#2A3A4D] text-[#F0F6FC]'
          : 'bg-[#111923]/60 border border-[#1F2D3D] hover:bg-[#17212B]/70 hover:border-[#2A3A4D] text-[#8B949E]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <SeverityBadge severity={finding.severity} size="sm" />
        <span className="font-mono text-[11px] text-[#586069]">
          +{finding.risk_contribution}
        </span>
      </div>

      <div className="font-medium text-xs truncate text-[#F0F6FC]">
        {finding.title}
      </div>

      <div className="font-mono text-[11px] text-[#8B949E] truncate">
        {finding.file}:{finding.line_start}
      </div>
    </div>
  );
};
