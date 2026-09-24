import { NormalizedFinding } from '../src/types';

export interface StackTraceMappingResult {
  parsedFile?: string;
  parsedLine?: number;
  parsedFunction?: string;
  exceptionType?: string;
  exceptionMessage?: string;
  matchedFinding?: NormalizedFinding;
  confidence: number;
  rootCauseAnalysis: string;
  suggestedMitigation: string;
}

/**
 * Parses Python / JavaScript / Go stack traces and correlates them with PR findings
 */
export function analyzeStackTrace(
  stackTraceText: string,
  findings: NormalizedFinding[]
): StackTraceMappingResult {
  if (!stackTraceText || !stackTraceText.trim()) {
    return {
      confidence: 0,
      rootCauseAnalysis: 'Empty stack trace provided.',
      suggestedMitigation: 'Paste a complete error trace including file paths and line numbers.',
    };
  }

  // Regex 1: Python style
  // File "services/payment.py", line 42, in fetch_customer_payment_profile
  const pyMatch = stackTraceText.match(/File\s+"([^"]+)",\s+line\s+(\d+),\s+in\s+([a-zA-Z0-9_]+)/);

  // Regex 2: Node.js / JS style
  // at fetch_customer_payment_profile (/app/services/payment.ts:42:15)
  const jsMatch = stackTraceText.match(/at\s+([a-zA-Z0-9_.]+)\s+\((?:.*\/)?([^:]+):(\d+):(\d+)\)/);

  // Regex 3: Alternate JS style (without parentheses)
  // at /app/services/payment.ts:42:15
  const jsMatch2 = stackTraceText.match(/at\s+(?:.*\/)?([^:]+):(\d+):(\d+)/);

  let file: string | undefined;
  let line: number | undefined;
  let func: string | undefined;

  if (pyMatch) {
    file = pyMatch[1];
    line = parseInt(pyMatch[2], 10);
    func = pyMatch[3];
  } else if (jsMatch) {
    func = jsMatch[1];
    file = jsMatch[2];
    line = parseInt(jsMatch[3], 10);
  } else if (jsMatch2) {
    file = jsMatch2[1];
    line = parseInt(jsMatch2[2], 10);
  }

  // Extract exception header if present (e.g. TypeError: Cannot read properties of undefined)
  const firstLine = stackTraceText.split('\n')[0].trim();
  const exceptionMatch = firstLine.match(/^([A-Za-z0-9_]+Error|[A-Za-z0-9_]+Exception):\s*(.+)/);
  const exceptionType = exceptionMatch ? exceptionMatch[1] : undefined;
  const exceptionMessage = exceptionMatch ? exceptionMatch[2] : firstLine;

  if (!file || !line) {
    return {
      confidence: 0.2,
      rootCauseAnalysis: 'Unable to confidently map stack trace to specific source lines in the Pull Request.',
      suggestedMitigation: 'Verify that the stack trace originates from files touched in this Pull Request diff.',
    };
  }

  // Correlate with active PR findings
  const matched = findings.find((f) => {
    const filenameMatches = f.file.includes(file!) || file!.includes(f.file);
    const lineClose = Math.abs(f.line_start - line!) <= 5;
    return filenameMatches && lineClose;
  });

  if (matched) {
    return {
      parsedFile: file,
      parsedLine: line,
      parsedFunction: func,
      exceptionType,
      exceptionMessage,
      matchedFinding: matched,
      confidence: 0.95,
      rootCauseAnalysis: `Stack trace directly maps to ${file}:${line} (${matched.title}). The crash matches finding ${matched.id} (${matched.type}).`,
      suggestedMitigation: `Apply verified autofix for finding ${matched.id}: ${matched.suggested_fix}`,
    };
  }

  return {
    parsedFile: file,
    parsedLine: line,
    parsedFunction: func,
    exceptionType,
    exceptionMessage,
    confidence: 0.7,
    rootCauseAnalysis: `Stack trace points to ${file}:${line}, but does not correspond to an existing high-severity PR alert.`,
    suggestedMitigation: 'Inspect surrounding control flow and add parameter guard checks.',
  };
}
