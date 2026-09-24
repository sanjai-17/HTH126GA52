import React from 'react';
import { GitPullRequest, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { ActionButton } from './ActionButton';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Pull Request analyzed yet',
  description = 'Analyze a GitHub Pull Request to identify release blockers, verify security reachability, and preview counterfactual risk reduction.',
  actionText = 'Analyze Pull Request',
  onAction,
  icon,
}) => {
  return (
    <div className="p-12 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 text-center max-w-xl mx-auto space-y-5">
      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
        {icon || <GitPullRequest className="w-6 h-6 text-zinc-500" />}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">{description}</p>
      </div>

      <div className="bg-zinc-900/60 rounded-lg p-3 text-left max-w-sm mx-auto border border-zinc-800/80 space-y-1 text-xs text-zinc-400">
        <div className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider mb-1">
          Analysis deliverables include:
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Contextual false-positive shield filtering</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 ml-1 shrink-0" />
          <span>Top-3 Must-Fix release blockers</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 ml-1 shrink-0" />
          <span>Verified autofix sandbox with AST syntax checks</span>
        </div>
      </div>

      {onAction && (
        <div className="pt-2">
          <ActionButton variant="primary" size="md" icon={ArrowRight} iconPosition="right" onClick={onAction}>
            {actionText}
          </ActionButton>
        </div>
      )}
    </div>
  );
};
