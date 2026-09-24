import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus:outline-none focus:ring-1 focus:ring-[#B8F34A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

  const sizes = {
    sm: 'text-xs px-2.5 py-1 rounded gap-1.5',
    md: 'text-xs px-3.5 py-1.5 rounded gap-2',
    lg: 'text-sm px-4 py-2 rounded gap-2 font-medium',
  };

  const variants = {
    // Distinctive electric lime primary button
    primary:
      'bg-[#B8F34A] hover:bg-[#C6F764] text-[#0B1117] font-semibold shadow-sm border border-[#B8F34A]',
    secondary:
      'bg-[#111923] hover:bg-[#17212B] text-[#F0F6FC] border border-[#1F2D3D] hover:border-[#2A3A4D]',
    danger:
      'bg-[#FF5C5C]/10 hover:bg-[#FF5C5C]/20 text-[#FF5C5C] border border-[#FF5C5C]/25',
    ghost:
      'hover:bg-[#111923] text-[#8B949E] hover:text-[#F0F6FC] border border-transparent',
    success:
      'bg-[#3FB950]/15 hover:bg-[#3FB950]/25 text-[#3FB950] border border-[#3FB950]/30',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{children}</span>
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );
};
