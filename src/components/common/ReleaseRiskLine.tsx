import React from 'react';

interface ReleaseRiskLineProps {
  score: number; // 0 - 100
  riskLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  simulatedScore?: number;
  showLabels?: boolean;
  compact?: boolean;
}

export const ReleaseRiskLine: React.FC<ReleaseRiskLineProps> = ({
  score,
  riskLevel,
  simulatedScore,
  showLabels = true,
  compact = false,
}) => {
  // Clamp score
  const clampedScore = Math.max(0, Math.min(100, score));
  const clampedSimulated =
    simulatedScore !== undefined ? Math.max(0, Math.min(100, simulatedScore)) : undefined;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return '#FF5C5C';
      case 'HIGH':
        return '#FFB547';
      case 'ELEVATED':
        return '#FFB547';
      case 'MODERATE':
        return '#38BDF8';
      case 'LOW':
      default:
        return '#3FB950';
    }
  };

  const levelColor = getLevelColor(riskLevel);

  return (
    <div className={`w-full ${compact ? 'py-1' : 'py-3'} select-none`}>
      {/* Category Labels above the track */}
      {showLabels && (
        <div className="flex justify-between items-center text-[10px] font-mono tracking-wider text-[#8B949E] uppercase mb-1.5 px-0.5">
          <span className={clampedScore <= 20 ? 'text-[#3FB950] font-semibold' : ''}>Safe</span>
          <span className={clampedScore > 20 && clampedScore <= 40 ? 'text-[#38BDF8] font-semibold' : ''}>Moderate</span>
          <span className={clampedScore > 40 && clampedScore <= 60 ? 'text-[#FFB547] font-semibold' : ''}>Elevated</span>
          <span className={clampedScore > 60 && clampedScore <= 80 ? 'text-[#FFB547] font-semibold' : ''}>High</span>
          <span className={clampedScore > 80 ? 'text-[#FF5C5C] font-semibold' : ''}>Critical</span>
        </div>
      )}

      {/* Main Track & Segmented Scale */}
      <div className="relative h-2 w-full bg-[#111923] rounded-sm border border-[#1F2D3D] overflow-visible">
        {/* Color segmented bands subtle background */}
        <div className="absolute inset-0 flex rounded-sm overflow-hidden opacity-30">
          <div className="w-[20%] bg-[#3FB950]" title="0-20 Safe" />
          <div className="w-[20%] bg-[#38BDF8]" title="21-40 Moderate" />
          <div className="w-[20%] bg-[#FFB547]" title="41-60 Elevated" />
          <div className="w-[20%] bg-[#FB923C]" title="61-80 High" />
          <div className="w-[20%] bg-[#FF5C5C]" title="81-100 Critical" />
        </div>

        {/* Active progress fill */}
        <div
          className="absolute top-0 bottom-0 left-0 transition-all duration-300 rounded-sm"
          style={{
            width: `${clampedScore}%`,
            backgroundColor: levelColor,
            opacity: 0.85,
          }}
        />

        {/* Projected fill if simulated */}
        {clampedSimulated !== undefined && (
          <div
            className="absolute top-0 bottom-0 border-r-2 border-[#B8F34A] border-dashed transition-all duration-300"
            style={{ left: `${clampedSimulated}%` }}
            title={`Projected: ${clampedSimulated}`}
          />
        )}

        {/* Ticks at 20, 40, 60, 80 */}
        <div className="absolute inset-0 flex justify-between pointer-events-none px-[20%]">
          <div className="w-px h-full bg-[#0B1117] opacity-60" />
          <div className="w-px h-full bg-[#0B1117] opacity-60" />
          <div className="w-px h-full bg-[#0B1117] opacity-60" />
        </div>

        {/* Indicator Caret & Current Score Value */}
        <div
          className="absolute -top-1 -translate-x-1/2 transition-all duration-300 flex flex-col items-center pointer-events-none"
          style={{ left: `${clampedScore}%` }}
        >
          {/* Needle / Marker */}
          <div
            className="w-2.5 h-4 rounded-sm border border-[#0B1117] shadow-sm flex items-center justify-center"
            style={{ backgroundColor: levelColor }}
          >
            <div className="w-0.5 h-2 bg-[#0B1117]" />
          </div>
        </div>
      </div>

      {/* Numerical Calibration line below */}
      <div className="flex justify-between items-center text-[10px] font-mono text-[#586069] mt-1.5 px-0.5">
        <span>0</span>
        <span>20</span>
        <span>40</span>
        <span>60</span>
        <span>80</span>
        <span>100</span>
      </div>

      {/* Pointer readout */}
      <div className="relative w-full h-7 mt-0.5">
        <div
          className="absolute -translate-x-1/2 flex flex-col items-center transition-all duration-300 pointer-events-none"
          style={{ left: `${clampedScore}%` }}
        >
          <span className="text-[9px] text-[#8B949E] leading-none">▲</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono font-bold text-xs" style={{ color: levelColor }}>
              {clampedScore}
            </span>
            <span
              className="text-[9px] font-mono px-1 py-0.2 rounded border uppercase font-medium"
              style={{
                color: levelColor,
                borderColor: `${levelColor}40`,
                backgroundColor: `${levelColor}15`,
              }}
            >
              {riskLevel}
            </span>
          </div>
        </div>

        {clampedSimulated !== undefined && clampedSimulated !== clampedScore && (
          <div
            className="absolute -translate-x-1/2 flex flex-col items-center transition-all duration-300 pointer-events-none"
            style={{ left: `${clampedSimulated}%` }}
          >
            <span className="text-[9px] text-[#B8F34A] leading-none">▲</span>
            <span className="font-mono font-bold text-[11px] text-[#B8F34A] mt-0.5">
              {clampedSimulated} proj.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
