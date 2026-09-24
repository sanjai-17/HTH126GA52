import React from 'react';
import { FindingSeverity, FindingCategory } from '../../types';

export const SeverityBadge: React.FC<{ severity: FindingSeverity; size?: 'sm' | 'md' }> = ({
  severity,
  size = 'sm',
}) => {
  const styles: Record<FindingSeverity, { label: string; className: string }> = {
    CRITICAL: {
      label: 'Critical',
      className: 'bg-[#FF5C5C]/10 text-[#FF5C5C] border-[#FF5C5C]/25 font-semibold',
    },
    HIGH: {
      label: 'High',
      className: 'bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/25 font-medium',
    },
    MEDIUM: {
      label: 'Medium',
      className: 'bg-[#111923] text-[#8B949E] border-[#1F2D3D] font-medium',
    },
    LOW: {
      label: 'Low',
      className: 'bg-[#111923] text-[#586069] border-[#1F2D3D] font-medium',
    },
  };

  const current = styles[severity] || styles.LOW;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border ${current.className} ${sizeClasses} select-none`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      <span>{current.label}</span>
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: FindingCategory }> = ({ category }) => {
  const formatLabel = (cat: string) => {
    return cat.charAt(0) + cat.slice(1).toLowerCase().replace(/_/g, ' ');
  };

  return (
    <span className="inline-flex items-center rounded border border-[#1F2D3D] bg-[#111923] px-2 py-0.5 text-[11px] text-[#8B949E] font-medium select-none">
      {formatLabel(category)}
    </span>
  );
};
