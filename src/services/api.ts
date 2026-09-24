import {
  AnalysisRun,
  NormalizedFinding,
  RiskScore,
  FixVerificationResult,
  OverallEvaluationMetrics,
  RepositoryMemoryItem,
  DeveloperFeedbackRecord,
} from '../types';

const API_BASE = '/api';

export async function fetchDemoAnalysis(scenarioId: string): Promise<AnalysisRun> {
  const res = await fetch(`${API_BASE}/analyze/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId }),
  });
  if (!res.ok) throw new Error(`Demo analysis failed: ${res.statusText}`);
  return res.json();
}

export async function analyzePRUrl(url: string): Promise<AnalysisRun> {
  const res = await fetch(`${API_BASE}/analyze/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to analyze GitHub PR: ${res.statusText}`);
  }
  return res.json();
}

export async function analyzeDiffText(diffText: string, filename?: string): Promise<AnalysisRun> {
  const res = await fetch(`${API_BASE}/analyze/diff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diffText, filename }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to analyze diff: ${res.statusText}`);
  }
  return res.json();
}

export async function verifyFix(findingId: string, patch?: string): Promise<FixVerificationResult> {
  const res = await fetch(`${API_BASE}/findings/${findingId}/verify-fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patch }),
  });
  if (!res.ok) throw new Error(`Fix verification failed: ${res.statusText}`);
  return res.json();
}

export async function generateFix(findingId: string): Promise<{ suggested_fix: string; patch: string; fixed_code?: string }> {
  const res = await fetch(`${API_BASE}/findings/${findingId}/generate-fix`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to generate fix: ${res.statusText}`);
  return res.json();
}

export async function generateTest(findingId: string): Promise<{ test_code: string; test_status: string }> {
  const res = await fetch(`${API_BASE}/findings/${findingId}/generate-test`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to generate test: ${res.statusText}`);
  return res.json();
}

export async function simulateRisk(runId: string, resolvedFindingIds: string[]): Promise<{
  original_score: number;
  simulated_score: number;
  risk_reduction: number;
  recalculated_risk: RiskScore;
  resolved_count: number;
}> {
  const res = await fetch(`${API_BASE}/risk/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId, resolvedFindingIds }),
  });
  if (!res.ok) throw new Error(`Risk simulation failed: ${res.statusText}`);
  return res.json();
}

export async function fetchEvaluationMetrics(): Promise<OverallEvaluationMetrics> {
  const res = await fetch(`${API_BASE}/evaluation`);
  if (!res.ok) throw new Error(`Failed to fetch evaluation metrics: ${res.statusText}`);
  return res.json();
}

export async function runEvaluation(): Promise<OverallEvaluationMetrics> {
  const res = await fetch(`${API_BASE}/evaluation/run`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to run evaluation: ${res.statusText}`);
  return res.json();
}

export async function fetchRepositoryMemory(repoId = 'default'): Promise<RepositoryMemoryItem[]> {
  const res = await fetch(`${API_BASE}/repositories/${repoId}/memory`);
  if (!res.ok) throw new Error(`Failed to fetch repository memory: ${res.statusText}`);
  return res.json();
}

export async function addRepositoryMemory(
  repoId = 'default',
  item: Omit<RepositoryMemoryItem, 'id' | 'created_at'>
): Promise<RepositoryMemoryItem> {
  const res = await fetch(`${API_BASE}/repositories/${repoId}/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`Failed to add memory item: ${res.statusText}`);
  return res.json();
}

export async function deleteRepositoryMemory(repoId = 'default', itemId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/repositories/${repoId}/memory/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success;
}

export async function submitDeveloperFeedback(
  findingId: string,
  findingTitle: string,
  file: string,
  status: 'USEFUL' | 'NOT_USEFUL' | 'FALSE_POSITIVE' | 'FIXED' | 'WONT_FIX' | 'NEEDS_REVIEW',
  notes?: string
): Promise<DeveloperFeedbackRecord> {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ findingId, findingTitle, file, status, notes }),
  });
  if (!res.ok) throw new Error(`Failed to submit feedback: ${res.statusText}`);
  return res.json();
}

export async function fetchDeveloperFeedback(): Promise<DeveloperFeedbackRecord[]> {
  const res = await fetch(`${API_BASE}/feedback`);
  if (!res.ok) throw new Error(`Failed to fetch feedback: ${res.statusText}`);
  return res.json();
}

export async function analyzeStackTrace(stackTrace: string, runId?: string) {
  const res = await fetch(`${API_BASE}/stacktrace/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stackTrace, runId }),
  });
  if (!res.ok) throw new Error(`Failed to analyze stack trace: ${res.statusText}`);
  return res.json();
}

export async function fetchHealthStatus() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Failed to fetch health status: ${res.statusText}`);
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error(`Failed to fetch settings: ${res.statusText}`);
  return res.json();
}
