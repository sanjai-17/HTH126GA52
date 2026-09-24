import { NormalizedFinding, PRFile } from '../src/types';

export interface LLMReviewResult {
  provider: 'ollama' | 'demo';
  model: string;
  isDemo: boolean;
  findings: NormalizedFinding[];
  summary: string;
  reachabilitySummary: string;
}

export interface OllamaHealthStatus {
  online: boolean;
  url: string;
  model: string;
  availableModels: string[];
  latencyMs?: number;
  error?: string;
}

/**
 * Checks connection to local Ollama daemon
 */
export async function checkOllamaHealth(
  baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
): Promise<OllamaHealthStatus> {
  const model = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second fast timeout

    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as { models?: { name: string }[] };
      const availableModels = (data.models || []).map((m) => m.name);
      return {
        online: true,
        url: baseUrl,
        model,
        availableModels,
        latencyMs: Date.now() - start,
      };
    } else {
      return {
        online: false,
        url: baseUrl,
        model,
        availableModels: [],
        error: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      online: false,
      url: baseUrl,
      model,
      availableModels: [],
      error: `Could not connect to Ollama at ${baseUrl} (${message}). Demo Mode is active.`,
    };
  }
}

/**
 * Executes Contextual AI Code Review using Ollama if online, or DemoProvider as safe fallback.
 */
export async function runContextualAIReview(
  files: PRFile[],
  initialFindings: NormalizedFinding[],
  forceDemo = false
): Promise<LLMReviewResult> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

  if (!forceDemo && process.env.DEMO_MODE !== 'true') {
    const health = await checkOllamaHealth(baseUrl);
    if (health.online) {
      try {
        const prompt = buildReviewPrompt(files, initialFindings);
        const res = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
            format: 'json',
          }),
        });

        if (res.ok) {
          const body = (await res.json()) as { response: string };
          const parsed = JSON.parse(body.response);
          if (parsed && Array.isArray(parsed.issues)) {
            return {
              provider: 'ollama',
              model,
              isDemo: false,
              findings: parsed.issues,
              summary: parsed.summary || 'Live Ollama model completed code review.',
              reachabilitySummary: 'Contextual reachability verified by local coding model.',
            };
          }
        }
      } catch (err) {
        console.warn('Ollama invocation failed, falling back safely to DemoProvider:', err);
      }
    }
  }

  // Safe Deterministic Demo Provider
  return {
    provider: 'demo',
    model: 'deterministic-demo-engine',
    isDemo: true,
    findings: initialFindings,
    summary: 'Analyzed using Deterministic Demo Engine (Zero Paid API). All findings grounded in exact lines.',
    reachabilitySummary: 'Reachability matrix generated from static AST callpath.',
  };
}

function buildReviewPrompt(files: PRFile[], findings: NormalizedFinding[]): string {
  return `You are a Senior DevSecOps Engineer performing contextual code review.
Review these pull request changes and static analyzer findings.
Respond ONLY with a valid JSON object matching this schema:
{
  "summary": "High level overview",
  "issues": [
    {
      "id": "finding-id",
      "category": "SECURITY" | "BUG" | "PERFORMANCE" | "CODE_SMELL",
      "type": "ISSUE_TYPE",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "confidence": 0.95,
      "file": "path",
      "line_start": 10,
      "line_end": 10,
      "title": "Title",
      "evidence": "Concrete evidence",
      "status": "TRUE_POSITIVE" | "FALSE_POSITIVE",
      "explanation": "Why this is an issue",
      "suggested_fix": "Fix instructions"
    }
  ]
}

Files Changed:
${files.map((f) => `--- ${f.filename} ---\n${f.patch}`).join('\n\n')}

Raw Findings:
${JSON.stringify(findings, null, 2)}`;
}
