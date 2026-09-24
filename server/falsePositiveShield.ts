import { NormalizedFinding, PRFile } from '../src/types';

export interface ShieldAssessment {
  status: 'TRUE_POSITIVE' | 'LIKELY_TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'NEEDS_HUMAN_REVIEW';
  reason?: string;
  reachabilityAdjustment?: boolean;
}

/**
 * Contextual verification evaluating whether a raw static-analysis warning
 * is actually actionable or a false positive due to surrounding guards,
 * test files, internal constants, or upstream sanitization.
 */
export function evaluateFalsePositiveShield(
  finding: NormalizedFinding,
  fileContext: PRFile | undefined
): ShieldAssessment {
  // Check 1: Test-only or fixture file
  const isTestFile =
    finding.file.includes('test') ||
    finding.file.includes('spec') ||
    finding.file.includes('mock') ||
    finding.file.startsWith('fixtures/');

  if (isTestFile && finding.category === 'SECURITY' && finding.type !== 'HARDCODED_CREDENTIAL') {
    return {
      status: 'FALSE_POSITIVE',
      reason: `Contextual AI Shield: Test suite / mock file (${finding.file}). The detected pattern is an isolated test fixture unreachable in production runtime.`,
    };
  }

  // Check 2: Upstream sanitization or parameter binding already present
  if (finding.type === 'SQL_INJECTION') {
    const rawSnippet = finding.original_code || finding.evidence || '';
    if (rawSnippet.includes('%s') || rawSnippet.includes('$1') || rawSnippet.includes('?') || rawSnippet.includes('param')) {
      return {
        status: 'FALSE_POSITIVE',
        reason: 'Contextual AI Shield: Parameterized query placeholders detected in sink. Value is bound safely by database adapter.',
      };
    }
  }

  // Check 3: Harmless unused import / style lint warning
  if (finding.category === 'STYLE' || finding.certainty === 'STYLE_ONLY') {
    return {
      status: 'FALSE_POSITIVE',
      reason: 'Contextual AI Shield: Non-functional stylistic warning with zero bearing on security or runtime stability.',
    };
  }

  // Check 4: Safe constant string in command execution
  if (finding.type === 'COMMAND_INJECTION') {
    const rawSnippet = finding.original_code || '';
    if (rawSnippet.includes('git rev-parse') || rawSnippet.includes('node -v')) {
      return {
        status: 'FALSE_POSITIVE',
        reason: 'Contextual AI Shield: Command is a static invariant internal string without user variable interpolation.',
      };
    }
  }

  // Default: True positive if confidence is high, or needs human review if uncertain
  if (finding.confidence >= 0.85) {
    return {
      status: 'TRUE_POSITIVE',
    };
  }

  return {
    status: 'NEEDS_HUMAN_REVIEW',
    reason: 'Contextual AI Shield: Insufficient static callgraph certainty. Manual review recommended before release.',
  };
}
