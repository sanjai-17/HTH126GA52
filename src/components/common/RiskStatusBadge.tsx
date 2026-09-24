import React from 'react';
import { RiskScore } from '../../types';

interface RiskStatusBadgeProps {
  level: RiskScore['risk_level'];
  size?: 'sm' | 'md';
}

export const RiskStatusBadge: React.FC<RiskStatusBadgeProps> = ({ level, size = 'sm' }) => {
  const configs: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
    CRITICAL: {
      label: 'Critical risk',
      bg: 'bg-[#FF5C5C]/10',
      text: 'text-[#FF5C5C]',
      border: 'border-[#FF5C5C]/25',
      dot: 'bg-[#FF5C5C]',
    },
    HIGH: {
      label: 'High risk',
      bg: 'bg-[#FFB547]/10',
      text: 'text-[#FFB547]',
      border: 'border-[#FFB547]/25',
      dot: 'bg-[#FFB547]',
    },
    ELEVATED: {
      label: 'Elevated risk',
      bg: 'bg-[#FFB547]/10',
      text: 'text-[#FFB547]',
      border: 'border-[#FFB547]/25',
      dot: 'bg-[#FFB547]',
    },
    MODERATE: {
      label: 'Moderate risk',
      bg: 'bg-[#111923]',
      text: 'text-[#8B949E]',
      border: 'border-[#1F2D3D]',
      dot: 'bg-[#8B949E]',
    },
    LOW: {
      label: 'Safe / Low risk',
      bg: 'bg-[#3FB950]/10',
      text: 'text-[#3FB950]',
      border: 'border-[#3FB950]/25',
      dot: 'bg-[#3FB950]',
    },
  };

  const current = configs[level] || configs.LOW;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-medium border ${current.bg} ${current.text} ${current.border} ${padding} select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};
