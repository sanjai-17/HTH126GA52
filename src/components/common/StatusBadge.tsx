import React from 'react';
import { VerificationStatus, FixVerificationOutcome, CheckStatus } from '../../types';
import { ShieldCheck, ShieldAlert, HelpCircle, Check, X, Clock } from 'lucide-react';

export const VerificationBadge: React.FC<{ status: VerificationStatus }> = ({ status }) => {
  switch (status) {
    case 'TRUE_POSITIVE':
    case 'LIKELY_TRUE_POSITIVE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-[#FF5C5C]/10 text-[#FF5C5C] border-[#FF5C5C]/25 select-none">
          <ShieldAlert className="w-3 h-3 text-[#FF5C5C]" />
          True positive
        </span>
      );
    case 'FALSE_POSITIVE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-[#111923] text-[#8B949E] border-[#1F2D3D] select-none">
          <ShieldCheck className="w-3 h-3 text-[#8B949E]" />
          Filtered (FP)
        </span>
      );
    case 'NEEDS_HUMAN_REVIEW':
    case 'UNCERTAIN':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/25 select-none">
          <HelpCircle className="w-3 h-3 text-[#FFB547]" />
          Needs review
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-[#111923] text-[#586069] border-[#1F2D3D] select-none">
          Pending
        </span>
      );
  }
};

export const FixOutcomeBadge: React.FC<{ outcome: FixVerificationOutcome }> = ({ outcome }) => {
  switch (outcome) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-[#B8F34A]/15 text-[#B8F34A] border-[#B8F34A]/30 select-none">
          <Check className="w-3 h-3 text-[#B8F34A]" />
          Verified
        </span>
      );
    case 'PARTIALLY_VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/25 select-none">
          <Clock className="w-3 h-3" />
          Partially verified
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-[#FF5C5C]/10 text-[#FF5C5C] border-[#FF5C5C]/25 select-none">
          <X className="w-3 h-3" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium bg-[#111923] text-[#586069] border-[#1F2D3D] select-none">
          Unverified
        </span>
      );
  }
};

export const CheckStatusBadge: React.FC<{ status: CheckStatus; label: string }> = ({
  status,
  label,
}) => {
  if (status === 'PASS') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[#B8F34A] font-medium select-none">
        <Check className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'FAIL') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-[#FF5C5C] font-medium select-none">
        <X className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-[#586069] select-none">
      <Clock className="w-3 h-3" />
      <span>{label}</span>
    </span>
  );
};
