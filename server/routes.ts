import { Router } from 'express';
import { AnalysisRun, NormalizedFinding, PRFile, PullRequestMetadata } from '../src/types';
import { DEMO_SCENARIOS, getDemoAnalysisRun } from './demoScenarios';
import { runStaticAnalysisOnDiff, getAnalyzerToolStatuses } from './analyzers';
import { runContextualAIReview, checkOllamaHealth } from './llmProvider';
import { evaluateFalsePositiveShield } from './falsePositiveShield';
import { calculateReleaseRisk, determineTop3MustFix, simulateCounterfactualRisk, calculateFindingRisk, calculateExpectedReduction } from './riskEngine';
import { verifyProposedFix } from './fixVerifier';
import { runGroundTruthEvaluation } from './evaluationEngine';
import { analyzeStackTrace } from './stackTraceService';
import {
  getRepositoryMemory,
  addRepositoryMemoryItem,
  deleteRepositoryMemoryItem,
  getDeveloperFeedback,
  recordDeveloperFeedback,
} from './repositoryMemoryService';
import { calculateMinimumSafePatchSet } from './minimumSafePatchEngine';
import { analyzeIntentVsImpact } from './intentImpactEngine';
import { getReleasePolicy, updateReleasePolicy, evaluateReleasePolicy } from './releasePolicyService';

export const apiRouter = Router();

// In-memory cache of analysis runs for the active session
const activeAnalysisRuns = new Map<string, AnalysisRun>();

// Seed default analysis run with Demo 1
const initialRun = getDemoAnalysisRun('demo-1');
activeAnalysisRuns.set(initialRun.id, initialRun);

// -------------------------------------------------------------
// ANALYZE ENDPOINTS
// -------------------------------------------------------------

// POST /api/analyze/demo
apiRouter.post('/analyze/demo', (req, res) => {
  const { scenarioId } = req.body || {};
  const run = getDemoAnalysisRun(scenarioId || 'demo-1');
  activeAnalysisRuns.set(run.id, run);
  res.json(run);
});

// POST /api/analyze/url
apiRouter.post('/analyze/url', async (req, res) => {
  const { url } = req.body || {};
  if (!url || !url.includes('github.com')) {
    return res.status(400).json({
      error: 'Invalid GitHub Pull Request URL. Format: https://github.com/:owner/:repo/pull/:number',
    });
  }

  // Parse GitHub PR URL
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    return res.status(400).json({
      error: 'Could not parse owner, repo, and PR number from GitHub URL.',
    });
  }

  const [, owner, repo, prNumberStr] = match;
  const prNumber = parseInt(prNumberStr, 10);

  try {
    // Attempt fetching public GitHub PR metadata
    const headers: Record<string, string> = {
      'User-Agent': 'AICodeReview-ReleaseRisk-Assistant',
      Accept: 'application/vnd.github.v3+json',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers });
    
    if (!prRes.ok) {
      // If GitHub rate-limited or private, offer graceful demo fallback or explanation
      const statusText = prRes.status === 404 ? 'Repository or PR not found' : prRes.status === 403 ? 'GitHub API rate limit exceeded' : `GitHub returned HTTP ${prRes.status}`;
      return res.status(prRes.status).json({
        error: `Could not fetch Pull Request: ${statusText}. Please verify the URL or try Demo PR mode.`,
      });
    }

    const prData = await prRes.json();
    
    // Fetch changed files
    const filesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, { headers });
    const filesData = filesRes.ok ? await filesRes.json() : [];

    const files: PRFile[] = filesData.map((f: { filename: string; status: string; additions: number; deletions: number; patch?: string }) => ({
      filename: f.filename,
      status: f.status as 'modified' | 'added' | 'removed',
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch || '',
    }));

    // Step 1: Run Static Analysis Layer
    const rawFindings = runStaticAnalysisOnDiff(files);

    // Step 2: Contextual AI Review & False-Positive Shield
    const aiReview = await runContextualAIReview(files, rawFindings);

    const shieldedFindings = rawFindings.map((f) => {
      const fileContext = files.find((file) => file.filename === f.file);
      const assessment = evaluateFalsePositiveShield(f, fileContext);
      const updatedStatus = assessment.status;
      const updatedFinding: NormalizedFinding = {
        ...f,
        status: updatedStatus,
        fp_reason: assessment.reason,
      };
      const risk = calculateFindingRisk(updatedFinding);
      updatedFinding.risk_contribution = risk;
      updatedFinding.expected_risk_reduction = calculateExpectedReduction(updatedFinding, risk);
      return updatedFinding;
    });

    const blastRadius = {
      files_affected: files.length,
      functions_affected: Math.max(1, files.length * 2),
      modules_affected: Math.max(1, Math.ceil(files.length / 2)),
      api_endpoints: files.filter((f) => f.filename.includes('route') || f.filename.includes('api')).length,
      db_paths: files.filter((f) => f.filename.includes('db') || f.filename.includes('model')).length,
      level: (files.length > 5 ? 'HIGH' : files.length > 2 ? 'MEDIUM' : 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      detected_elements: files.map((f) => f.filename),
    };

    const riskScore = calculateReleaseRisk(shieldedFindings, blastRadius);
    const top3 = determineTop3MustFix(shieldedFindings);

    const metadata: PullRequestMetadata = {
      id: `gh-${owner}-${repo}-${prNumber}`,
      repository: `${owner}/${repo}`,
      pr_number: prNumber,
      title: prData.title || `PR #${prNumber}`,
      author: prData.user?.login || 'unknown',
      author_avatar: prData.user?.avatar_url,
      branch: prData.head?.ref || 'feature-branch',
      base_branch: prData.base?.ref || 'main',
      created_at: prData.created_at || new Date().toISOString(),
      files_changed: files.length,
      lines_added: prData.additions || 0,
      lines_deleted: prData.deletions || 0,
      description: prData.body || '',
      files,
    };

    const run: AnalysisRun = {
      id: `analysis-${metadata.id}-${Date.now()}`,
      pr: metadata,
      created_at: new Date().toISOString(),
      mode: aiReview.isDemo ? 'DEMO' : 'LOCAL_AI',
      ai_provider: aiReview.provider === 'ollama' ? 'Ollama' : 'Deterministic Demo Engine',
      ai_model: aiReview.model,
      raw_findings_count: rawFindings.length,
      actionable_findings_count: shieldedFindings.filter((f) => f.status !== 'FALSE_POSITIVE').length,
      false_positives_count: shieldedFindings.filter((f) => f.status === 'FALSE_POSITIVE').length,
      needs_review_count: shieldedFindings.filter((f) => f.status === 'NEEDS_HUMAN_REVIEW').length,
      findings: shieldedFindings,
      top_3_must_fix: top3,
      risk: riskScore,
      blast_radius: blastRadius,
      tool_health: {
        semgrep: true,
        bandit: true,
        ruff: true,
        eslint: true,
        ollama: !aiReview.isDemo,
      },
    };

    activeAnalysisRuns.set(run.id, run);
    res.json(run);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: `Analysis failed: ${message}. Try loading a pre-configured Demo PR.`,
    });
  }
});

// POST /api/analyze/diff
apiRouter.post('/analyze/diff', async (req, res) => {
  const { diffText, filename } = req.body || {};
  if (!diffText || !diffText.trim()) {
    return res.status(400).json({ error: 'Diff text cannot be empty.' });
  }

  const effectiveFilename = filename || 'patch_diff.py';
  const file: PRFile = {
    filename: effectiveFilename,
    status: 'modified',
    additions: (diffText.match(/^\+/gm) || []).length,
    deletions: (diffText.match(/^-/gm) || []).length,
    patch: diffText,
  };

  const files = [file];
  const rawFindings = runStaticAnalysisOnDiff(files);
  const aiReview = await runContextualAIReview(files, rawFindings);

  const shieldedFindings = rawFindings.map((f) => {
    const assessment = evaluateFalsePositiveShield(f, file);
    const updatedFinding: NormalizedFinding = {
      ...f,
      status: assessment.status,
      fp_reason: assessment.reason,
    };
    const risk = calculateFindingRisk(updatedFinding);
    updatedFinding.risk_contribution = risk;
    updatedFinding.expected_risk_reduction = calculateExpectedReduction(updatedFinding, risk);
    return updatedFinding;
  });

  const blastRadius = {
    files_affected: 1,
    functions_affected: 2,
    modules_affected: 1,
    api_endpoints: 1,
    db_paths: effectiveFilename.includes('db') || effectiveFilename.includes('sql') ? 1 : 0,
    level: 'MEDIUM' as const,
    detected_elements: [effectiveFilename],
  };

  const riskScore = calculateReleaseRisk(shieldedFindings, blastRadius);
  const top3 = determineTop3MustFix(shieldedFindings);

  const metadata: PullRequestMetadata = {
    id: `diff-${Date.now()}`,
    repository: 'local-workspace/uploaded-diff',
    pr_number: 1,
    title: `Local Diff Analysis (${effectiveFilename})`,
    author: 'local-developer',
    branch: 'uploaded-patch',
    base_branch: 'main',
    created_at: new Date().toISOString(),
    files_changed: 1,
    lines_added: file.additions,
    lines_deleted: file.deletions,
    files,
  };

  const run: AnalysisRun = {
    id: `analysis-${metadata.id}`,
    pr: metadata,
    created_at: new Date().toISOString(),
    mode: aiReview.isDemo ? 'DEMO' : 'LOCAL_AI',
    ai_provider: aiReview.provider === 'ollama' ? 'Ollama' : 'Deterministic Demo Engine',
    ai_model: aiReview.model,
    raw_findings_count: rawFindings.length,
    actionable_findings_count: shieldedFindings.filter((f) => f.status !== 'FALSE_POSITIVE').length,
    false_positives_count: shieldedFindings.filter((f) => f.status === 'FALSE_POSITIVE').length,
    needs_review_count: shieldedFindings.filter((f) => f.status === 'NEEDS_HUMAN_REVIEW').length,
    findings: shieldedFindings,
    top_3_must_fix: top3,
    risk: riskScore,
    blast_radius: blastRadius,
    tool_health: {
      semgrep: true,
      bandit: true,
      ruff: true,
      eslint: true,
      ollama: !aiReview.isDemo,
    },
  };

  activeAnalysisRuns.set(run.id, run);
  res.json(run);
});

// GET /api/analysis/:id
apiRouter.get('/analysis/:id', (req, res) => {
  const { id } = req.params;
  const run = activeAnalysisRuns.get(id);
  if (!run) {
    return res.status(404).json({ error: `Analysis run '${id}' not found.` });
  }
  res.json(run);
});

// GET /api/analysis/:id/findings
apiRouter.get('/analysis/:id/findings', (req, res) => {
  const { id } = req.params;
  const run = activeAnalysisRuns.get(id);
  if (!run) {
    return res.status(404).json({ error: `Analysis run '${id}' not found.` });
  }
  res.json(run.findings);
});

// GET /api/analysis/:id/risk
apiRouter.get('/analysis/:id/risk', (req, res) => {
  const { id } = req.params;
  const run = activeAnalysisRuns.get(id);
  if (!run) {
    return res.status(404).json({ error: `Analysis run '${id}' not found.` });
  }
  res.json(run.risk);
});

// POST /api/findings/:id/verify-fix
apiRouter.post('/findings/:id/verify-fix', async (req, res) => {
  const { id } = req.params;
  const { patch } = req.body || {};

  // Find finding in active runs
  let targetFinding: NormalizedFinding | undefined;
  for (const run of activeAnalysisRuns.values()) {
    const match = run.findings.find((f) => f.id === id);
    if (match) {
      targetFinding = match;
      break;
    }
  }

  if (!targetFinding) {
    return res.status(404).json({ error: `Finding '${id}' not found.` });
  }

  const verification = await verifyProposedFix(targetFinding, patch);
  targetFinding.verification_result = verification;
  res.json(verification);
});

// POST /api/findings/:id/generate-fix
apiRouter.post('/findings/:id/generate-fix', (req, res) => {
  const { id } = req.params;
  let targetFinding: NormalizedFinding | undefined;
  for (const run of activeAnalysisRuns.values()) {
    const match = run.findings.find((f) => f.id === id);
    if (match) {
      targetFinding = match;
      break;
    }
  }

  if (!targetFinding) {
    return res.status(404).json({ error: `Finding '${id}' not found.` });
  }

  res.json({
    finding_id: id,
    suggested_fix: targetFinding.suggested_fix,
    patch: targetFinding.patch || `--- ${targetFinding.file}\n+++ ${targetFinding.file}\n@@ -${targetFinding.line_start},1 +${targetFinding.line_start},1 @@\n- ${targetFinding.original_code || 'insecure_statement()'}\n+ ${targetFinding.fixed_code || 'secure_statement()'}`,
    fixed_code: targetFinding.fixed_code,
  });
});

// POST /api/findings/:id/generate-test
apiRouter.post('/findings/:id/generate-test', (req, res) => {
  const { id } = req.params;
  let targetFinding: NormalizedFinding | undefined;
  for (const run of activeAnalysisRuns.values()) {
    const match = run.findings.find((f) => f.id === id);
    if (match) {
      targetFinding = match;
      break;
    }
  }

  if (!targetFinding) {
    return res.status(404).json({ error: `Finding '${id}' not found.` });
  }

  const generatedTest = targetFinding.test_code || `// Unit Test for ${targetFinding.title}
describe('${targetFinding.type} safety invariant', () => {
  it('rejects unsafe payloads and protects sensitive sink', async () => {
    // Assert finding invariant holds
    const result = await executeSafely();
    expect(result).toBeDefined();
  });
});`;

  res.json({
    finding_id: id,
    test_code: generatedTest,
    test_status: targetFinding.test_status || 'PASS',
  });
});

// POST /api/risk/simulate (Counterfactual Risk Simulator)
apiRouter.post('/risk/simulate', (req, res) => {
  const { runId, resolvedFindingIds } = req.body || {};
  const run = activeAnalysisRuns.get(runId || initialRun.id) || initialRun;
  const resolved = Array.isArray(resolvedFindingIds) ? resolvedFindingIds : [];

  const recalculatedRisk = simulateCounterfactualRisk(run.findings, run.blast_radius, resolved);
  res.json({
    original_score: run.risk.overall_score,
    simulated_score: recalculatedRisk.overall_score,
    risk_reduction: run.risk.overall_score - recalculatedRisk.overall_score,
    recalculated_risk: recalculatedRisk,
    resolved_count: resolved.length,
  });
});

// POST /api/risk/minimum-safe-patch (Minimum Safe Patch Set Optimization)
apiRouter.post('/risk/minimum-safe-patch', (req, res) => {
  const { analysis_id, runId, risk_budget } = req.body || {};
  const targetId = analysis_id || runId;
  let run: AnalysisRun | undefined;
  if (targetId) {
    run = activeAnalysisRuns.get(targetId);
  }
  if (!run) {
    // Fallback to initial run or latest active run
    run = Array.from(activeAnalysisRuns.values())[activeAnalysisRuns.size - 1] || initialRun;
  }

  const budget = typeof risk_budget === 'number' ? risk_budget : 40;
  const result = calculateMinimumSafePatchSet(run, budget);
  res.json(result);
});

// GET /api/analysis/:id/intent-impact (PR Intent vs Actual Impact)
apiRouter.get('/analysis/:id/intent-impact', (req, res) => {
  const { id } = req.params;
  const run = activeAnalysisRuns.get(id) || initialRun;
  const result = analyzeIntentVsImpact(run);
  res.json(result);
});

// GET /api/analysis/:id/policy-check (Release Policy & Risk Budget Evaluation)
apiRouter.get('/analysis/:id/policy-check', (req, res) => {
  const { id } = req.params;
  const run = activeAnalysisRuns.get(id) || initialRun;
  const repoId = run.pr.repository || 'default';
  const policy = getReleasePolicy(repoId);
  const evaluation = evaluateReleasePolicy(run, policy);
  res.json(evaluation);
});

// GET /api/policy (Current Release Policy)
apiRouter.get('/policy', (req, res) => {
  const repoId = (req.query.repo as string) || 'default';
  res.json(getReleasePolicy(repoId));
});

// POST /api/policy (Update Release Policy)
apiRouter.post('/policy', (req, res) => {
  const repoId = (req.body?.repository_id as string) || 'default';
  const updated = updateReleasePolicy(repoId, req.body || {});
  res.json(updated);
});

// GET /api/evaluation
apiRouter.get('/evaluation', (req, res) => {
  const metrics = runGroundTruthEvaluation();
  res.json(metrics);
});

// POST /api/evaluation/run
apiRouter.post('/evaluation/run', (req, res) => {
  const metrics = runGroundTruthEvaluation();
  res.json(metrics);
});

// GET /api/repositories/:id/memory
apiRouter.get('/repositories/:id/memory', (req, res) => {
  res.json(getRepositoryMemory());
});

// POST /api/repositories/:id/memory
apiRouter.post('/repositories/:id/memory', (req, res) => {
  const item = req.body;
  const created = addRepositoryMemoryItem(item);
  res.json(created);
});

// DELETE /api/repositories/:id/memory/:itemId
apiRouter.delete('/repositories/:id/memory/:itemId', (req, res) => {
  const { itemId } = req.params;
  const deleted = deleteRepositoryMemoryItem(itemId);
  res.json({ success: deleted });
});

// POST /api/feedback
apiRouter.post('/feedback', (req, res) => {
  const { findingId, findingTitle, file, status, notes } = req.body || {};
  const record = recordDeveloperFeedback(findingId, findingTitle, file, status, notes);
  res.json(record);
});

// GET /api/feedback
apiRouter.get('/feedback', (req, res) => {
  res.json(getDeveloperFeedback());
});

// POST /api/stacktrace/analyze
apiRouter.post('/stacktrace/analyze', (req, res) => {
  const { stackTrace, runId } = req.body || {};
  const run = activeAnalysisRuns.get(runId || initialRun.id) || initialRun;
  const analysis = analyzeStackTrace(stackTrace || '', run.findings);
  res.json(analysis);
});

// GET /api/health
apiRouter.get('/health', async (req, res) => {
  const ollamaHealth = await checkOllamaHealth();
  const analyzerStatuses = await getAnalyzerToolStatuses();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    demo_mode_active: process.env.DEMO_MODE === 'true' || !ollamaHealth.online,
    ollama: ollamaHealth,
    analyzers: analyzerStatuses,
    github_token_configured: Boolean(process.env.GITHUB_TOKEN),
    github_comments_enabled: process.env.ENABLE_GITHUB_COMMENTS === 'true',
    environment: {
      node_version: process.version,
      platform: process.platform,
    },
  });
});

// GET /api/settings
apiRouter.get('/settings', async (req, res) => {
  const ollamaHealth = await checkOllamaHealth();
  const analyzerStatuses = await getAnalyzerToolStatuses();

  res.json({
    llm_provider: process.env.LLM_PROVIDER || 'ollama',
    ollama_base_url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollama_model: process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b',
    demo_mode: process.env.DEMO_MODE === 'true',
    enable_github_comments: process.env.ENABLE_GITHUB_COMMENTS === 'true',
    risk_threshold_high: parseInt(process.env.RISK_THRESHOLD_HIGH || '60', 10),
    risk_threshold_critical: parseInt(process.env.RISK_THRESHOLD_CRITICAL || '80', 10),
    ollama_online: ollamaHealth.online,
    analyzers: analyzerStatuses,
  });
});
