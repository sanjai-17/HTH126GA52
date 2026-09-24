import React from 'react';
import {
  LayoutDashboard,
  GitPullRequest,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Award,
  Database,
  Settings,
} from 'lucide-react';

export type NavigationPage =
  | 'overview'
  | 'analyze'
  | 'findings'
  | 'risk'
  | 'verification'
  | 'evaluation'
  | 'memory'
  | 'settings';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  actionableCount?: number;
  mustFixCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  actionableCount = 0,
}) => {
  const primaryNav = [
    { id: 'overview' as NavigationPage, label: 'Overview', icon: LayoutDashboard },
    { id: 'analyze' as NavigationPage, label: 'Analyze PR', icon: GitPullRequest },
  ];

  const analysisNav = [
    {
      id: 'findings' as NavigationPage,
      label: 'Findings',
      icon: AlertTriangle,
      badge: actionableCount > 0 ? actionableCount : undefined,
    },
    { id: 'risk' as NavigationPage, label: 'Risk', icon: TrendingDown },
    { id: 'verification' as NavigationPage, label: 'Fix Verification', icon: CheckCircle2 },
  ];

  const evalNav = [
    { id: 'evaluation' as NavigationPage, label: 'Evaluation', icon: Award },
  ];

  const configNav = [
    { id: 'memory' as NavigationPage, label: 'Repository Memory', icon: Database },
    { id: 'settings' as NavigationPage, label: 'Settings', icon: Settings },
  ];

  const renderItem = (item: {
    id: NavigationPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs transition-colors cursor-pointer select-none ${
          isActive
            ? 'bg-[#17212B] text-[#F0F6FC] font-medium border-l-2 border-[#B8F34A]'
            : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#111923] font-normal border-l-2 border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#B8F34A]' : 'text-[#586069]'}`} />
          <span>{item.label}</span>
        </div>

        {item.badge !== undefined && (
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              isActive
                ? 'bg-[#111923] text-[#B8F34A]'
                : 'bg-[#111923] text-[#8B949E]'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-52 shrink-0 border-r border-[#1F2D3D] bg-[#0B1117] flex flex-col justify-between p-3 select-none">
      <div className="space-y-4">
        {/* Primary Navigation */}
        <div className="space-y-0.5">
          {primaryNav.map(renderItem)}
        </div>

        {/* PR Investigation */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-mono uppercase tracking-wider text-[#586069]">
            Investigation
          </div>
          <div className="space-y-0.5">{analysisNav.map(renderItem)}</div>
        </div>

        {/* Validation */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-mono uppercase tracking-wider text-[#586069]">
            Validation
          </div>
          <div className="space-y-0.5">{evalNav.map(renderItem)}</div>
        </div>

        {/* Configuration */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-mono uppercase tracking-wider text-[#586069]">
            Configuration
          </div>
          <div className="space-y-0.5">{configNav.map(renderItem)}</div>
        </div>
      </div>

      {/* Bottom Status / Coordinate */}
      <div className="pt-3 border-t border-[#1F2D3D] px-2 text-[10px] font-mono text-[#586069] flex items-center justify-between">
        <span>Engine v1.0</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3FB950]" />
          <span>Online</span>
        </span>
      </div>
    </aside>
  );
};
