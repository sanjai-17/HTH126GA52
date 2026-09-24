import React from 'react';
import { RiskScore } from '../../types';
import { AlertTriangle, ShieldCheck, Flame, AlertCircle } from 'lucide-react';

interface RiskGaugeProps {
  risk: RiskScore;
  size?: 'sm' | 'md' | 'lg';
  simulatedScore?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ risk, size = 'md', simulatedScore }) => {
  const currentScore = simulatedScore !== undefined ? simulatedScore : risk.overall_score;

  // Threshold colors
  let color = 'text-emerald-400 stroke-emerald-400';
  let badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let levelText = 'LOW';
  let Icon = ShieldCheck;

  if (currentScore >= 81) {
    color = 'text-red-500 stroke-red-500';
    badgeBg = 'bg-red-500/15 text-red-400 border-red-500/40';
    levelText = 'CRITICAL';
    Icon = Flame;
  } else if (currentScore >= 61) {
    color = 'text-orange-500 stroke-orange-500';
    badgeBg = 'bg-orange-500/15 text-orange-400 border-orange-500/40';
    levelText = 'HIGH';
    Icon = AlertTriangle;
  } else if (currentScore >= 41) {
    color = 'text-amber-500 stroke-amber-500';
    badgeBg = 'bg-amber-500/15 text-amber-400 border-amber-500/40';
    levelText = 'ELEVATED';
    Icon = AlertCircle;
  } else if (currentScore >= 21) {
    color = 'text-yellow-400 stroke-yellow-400';
    badgeBg = 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40';
    levelText = 'MODERATE';
    Icon = AlertCircle;
  }

  const radius = size === 'sm' ? 36 : size === 'lg' ? 68 : 50;
  const strokeWidth = size === 'sm' ? 6 : size === 'lg' ? 10 : 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (currentScore / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center">
        <svg
          className="transform -rotate-90"
          width={(radius + strokeWidth) * 2}
          height={(radius + strokeWidth) * 2}
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            className="stroke-zinc-800"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active score circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            className={`${color} transition-all duration-700 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span
            className={`font-mono font-bold tracking-tight text-zinc-100 ${
              size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'
            }`}
          >
            {currentScore}
          </span>
          <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">/ 100</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Release Risk</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-wider ${badgeBg}`}>
            <Icon className="w-3 h-3" />
            {levelText}
          </span>
        </div>
        <p className="text-xs text-zinc-400 max-w-[200px] leading-relaxed">
          {simulatedScore !== undefined
            ? `Counterfactual simulation: Projected risk with selected fixes applied.`
            : `Deterministic calculation derived from findings, sinks, and blast radius.`}
        </p>
      </div>
    </div>
  );
};
