import React from 'react';
import { Check } from 'lucide-react';

export interface PipelineStep {
  id: string;
  label: string;
}

interface ProgressPipelineProps {
  title?: string;
  subtitle?: string;
  steps: PipelineStep[];
  currentStepIndex: number;
}

export const ProgressPipeline: React.FC<ProgressPipelineProps> = ({
  title = 'Analyzing pull request',
  subtitle = 'Running static analyzers, filtering false positives, and calculating release risk.',
  steps,
  currentStepIndex,
}) => {
  return (
    <div className="p-6 rounded border border-[#1F2D3D] bg-[#0B1117] max-w-lg mx-auto space-y-5 text-xs text-[#F0F6FC]">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-[#F0F6FC]">{title}</h2>
        {subtitle && <p className="text-[#8B949E]">{subtitle}</p>}
      </div>

      <div className="space-y-1.5">
        {steps.map((step, idx) => {
          const isDone = currentStepIndex > idx;
          const isCurrent = currentStepIndex === idx;

          return (
            <div
              key={step.id || idx}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded transition-colors ${
                isCurrent
                  ? 'bg-[#111923] text-[#F0F6FC] font-medium border border-[#2A3A4D]'
                  : isDone
                  ? 'text-[#8B949E]'
                  : 'text-[#586069]'
              }`}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5 text-[#B8F34A] shrink-0" />
              ) : isCurrent ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-[#B8F34A] border-t-transparent animate-spin shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-[#1F2D3D] shrink-0 flex items-center justify-center text-[9px] text-[#586069]">
                  {idx + 1}
                </div>
              )}
              <span className="truncate">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
