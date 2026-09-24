import React from 'react';

export const DemoBadge: React.FC<{ tooltip?: string }> = ({
  tooltip = 'Using sample pull request dataset',
}) => {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/60"
      title={tooltip}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
      <span>Demo mode</span>
    </span>
  );
};
