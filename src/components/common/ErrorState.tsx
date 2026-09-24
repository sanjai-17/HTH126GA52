import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { ActionButton } from './ActionButton';

interface ErrorStateProps {
  title?: string;
  reason: string;
  actionText?: string;
  onRetry?: () => void;
  technicalDetails?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Analysis could not be completed',
  reason,
  actionText = 'Retry analysis',
  onRetry,
  technicalDetails,
}) => {
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <div className="p-4 rounded border border-[#FF5C5C]/30 bg-[#FF5C5C]/10 text-left max-w-xl mx-auto space-y-3 text-xs text-[#F0F6FC]">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded bg-[#FF5C5C]/20 border border-[#FF5C5C]/40 flex items-center justify-center shrink-0 mt-0.5 text-[#FF5C5C]">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-[#FF5C5C]">{title}</h3>
          <p className="text-xs text-[#8B949E] leading-relaxed">
            {reason}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        {onRetry && (
          <ActionButton variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
            {actionText}
          </ActionButton>
        )}

        {technicalDetails && (
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            className="text-xs text-[#8B949E] hover:text-[#F0F6FC] flex items-center gap-1 transition-colors ml-auto font-mono cursor-pointer"
          >
            <span>{showTechnical ? 'Hide details' : 'Technical details'}</span>
            {showTechnical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {showTechnical && technicalDetails && (
        <pre className="p-3 rounded bg-[#0B1117] border border-[#1F2D3D] text-[11px] font-mono text-[#8B949E] whitespace-pre-wrap overflow-x-auto">
          {technicalDetails}
        </pre>
      )}
    </div>
  );
};
