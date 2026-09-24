import React, { useState, useEffect } from 'react';
import { AnalysisRun, NormalizedFinding } from './types';
import { fetchDemoAnalysis } from './services/api';
import { TopBar } from './components/layout/TopBar';
import { Sidebar, NavigationPage } from './components/layout/Sidebar';
import { Overview } from './pages/Overview';
import { AnalyzePR } from './pages/AnalyzePR';
import { Findings } from './pages/Findings';
import { RiskAnalysis } from './pages/RiskAnalysis';
import { FixVerification } from './pages/FixVerification';
import { Evaluation } from './pages/Evaluation';
import { RepositoryMemory } from './pages/RepositoryMemory';
import { Settings } from './pages/Settings';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export function App() {
  const [currentRun, setCurrentRun] = useState<AnalysisRun | null>(null);
  const [currentPage, setCurrentPage] = useState<NavigationPage>('overview');
  const [selectedFinding, setSelectedFinding] = useState<NormalizedFinding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScenario = async (scenarioId: string) => {
    setLoading(true);
    setError(null);
    try {
      const run = await fetchDemoAnalysis(scenarioId);
      setCurrentRun(run);
      // Select first finding by default for quick preview
      if (run.top_3_must_fix.length > 0) {
        setSelectedFinding(run.top_3_must_fix[0]);
      } else if (run.findings.length > 0) {
        setSelectedFinding(run.findings[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenario('demo-1');
  }, []);

  const handleFindingUpdated = (updated: NormalizedFinding) => {
    if (!currentRun) return;
    const updatedFindings = currentRun.findings.map((f) => (f.id === updated.id ? updated : f));
    setCurrentRun({ ...currentRun, findings: updatedFindings });
    setSelectedFinding(updated);
  };

  const handleSimulateRisk = async () => {
    setCurrentPage('risk');
  };

  if (loading && !currentRun) {
    return (
      <div className="min-h-screen bg-[#0B1117] text-[#F0F6FC] flex flex-col items-center justify-center space-y-3 font-mono">
        <RefreshCw className="w-6 h-6 text-[#B8F34A] animate-spin" />
        <p className="text-xs font-medium text-[#8B949E]">
          Loading release intelligence workspace...
        </p>
      </div>
    );
  }

  if (error && !currentRun) {
    return (
      <div className="min-h-screen bg-[#0B1117] text-[#F0F6FC] flex flex-col items-center justify-center p-6 space-y-4 font-mono">
        <AlertTriangle className="w-8 h-8 text-[#FFB547]" />
        <h1 className="text-sm font-semibold">Failed to load code review workspace</h1>
        <p className="text-xs text-[#8B949E] max-w-md text-center">{error}</p>
        <button
          onClick={() => loadScenario('demo-1')}
          className="px-4 py-2 rounded bg-[#B8F34A] hover:bg-[#C6F764] text-xs font-semibold text-[#0B1117] transition-colors cursor-pointer"
        >
          Load Demo PR #142 (Payment Gateway)
        </button>
      </div>
    );
  }

  if (!currentRun) return null;

  const actionableCount = currentRun.findings.filter((f) => f.status !== 'FALSE_POSITIVE').length;

  return (
    <div className="h-screen w-screen bg-[#0B1117] text-[#F0F6FC] flex flex-col font-sans overflow-hidden">
      {/* 1. Global Technical TopBar */}
      <TopBar
        currentRun={currentRun}
        onSelectDemo={loadScenario}
        onAnalyzeNewPR={() => setCurrentPage('analyze')}
      />

      {/* 2. Workspace Body (Sidebar + Content Viewport) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={(page) => setCurrentPage(page)}
          actionableCount={actionableCount}
          mustFixCount={currentRun.top_3_must_fix.length}
        />

        {/* Content Viewport */}
        <main
          className={`flex-1 ${
            currentPage === 'findings' ? 'overflow-hidden p-3' : 'overflow-y-auto p-4 md:p-6'
          } bg-[#0B1117] flex flex-col min-h-0`}
        >
          {currentPage === 'overview' && (
            <Overview
              run={currentRun}
              onSelectFinding={(f) => {
                setSelectedFinding(f);
                setCurrentPage('findings');
              }}
              onNavigate={(page) => setCurrentPage(page)}
            />
          )}

          {currentPage === 'analyze' && (
            <AnalyzePR
              onAnalysisComplete={(run) => {
                setCurrentRun(run);
                if (run.top_3_must_fix.length > 0) {
                  setSelectedFinding(run.top_3_must_fix[0]);
                }
              }}
              onNavigate={(page) => setCurrentPage(page)}
            />
          )}

          {currentPage === 'findings' && (
            <Findings
              run={currentRun}
              selectedFinding={selectedFinding}
              onSelectFinding={(f) => setSelectedFinding(f)}
              onCloseDetail={() => setSelectedFinding(null)}
              onFindingUpdated={handleFindingUpdated}
              onSimulateRisk={handleSimulateRisk}
            />
          )}

          {currentPage === 'risk' && (
            <RiskAnalysis
              run={currentRun}
              onSelectFinding={(f) => {
                setSelectedFinding(f);
                setCurrentPage('findings');
              }}
            />
          )}

          {currentPage === 'verification' && (
            <FixVerification
              run={currentRun}
              onSelectFinding={(f) => {
                setSelectedFinding(f);
                setCurrentPage('findings');
              }}
            />
          )}

          {currentPage === 'evaluation' && <Evaluation />}

          {currentPage === 'memory' && <RepositoryMemory />}

          {currentPage === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}

export default App;
