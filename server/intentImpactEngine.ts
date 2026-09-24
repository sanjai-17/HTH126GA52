import { AnalysisRun, IntentCategory, IntentImpactAnalysis, IntentImpactEvidence } from '../src/types';

/**
 * Keyword patterns to detect declared intent from title and description
 */
const INTENT_PATTERNS: { category: IntentCategory; keywords: RegExp[] }[] = [
  {
    category: 'DEPENDENCY',
    keywords: [/\b(dep|deps|dependency|dependencies|upgrade|bump|npm|cve|package\.json|requirements)\b/i],
  },
  {
    category: 'AUTHENTICATION',
    keywords: [/\b(auth|authenticate|login|oauth|jwt|session|credential|token|password)\b/i],
  },
  {
    category: 'AUTHORIZATION',
    keywords: [/\b(authorization|rbac|permission|role|access control|tenant|boundary)\b/i],
  },
  {
    category: 'DATABASE',
    keywords: [/\b(db|database|sql|postgres|mysql|query|schema|migration|table|entity|orm)\b/i],
  },
  {
    category: 'API',
    keywords: [/\b(api|endpoint|route|router|controller|rest|graphql|grpc|webhook)\b/i],
  },
  {
    category: 'BUSINESS_LOGIC',
    keywords: [/\b(logic|promo|discount|redemption|coupon|payment|checkout|cart|order|wallet|feature|calc|process)\b/i],
  },
  {
    category: 'PERFORMANCE',
    keywords: [/\b(perf|performance|optimize|n\+1|cache|latency|throughput|memory|leak)\b/i],
  },
  {
    category: 'TESTING',
    keywords: [/\b(test|tests|spec|mock|unit test|e2e|coverage|assertion)\b/i],
  },
  {
    category: 'REFACTORING',
    keywords: [/\b(refactor|cleanup|clean up|structure|reorganize|rename)\b/i],
  },
  {
    category: 'CONFIGURATION',
    keywords: [/\b(config|configuration|env|settings|yaml|docker|deploy)\b/i],
  },
  {
    category: 'SECURITY',
    keywords: [/\b(security|vulnerability|sanitize|patch|exploit|cve|fix security)\b/i],
  },
];

/**
 * Extracts declared scope from PR metadata
 */
export function extractDeclaredScope(title: string = '', description: string = ''): IntentCategory[] {
  const combinedText = `${title} ${description}`.toLowerCase();
  const detected = new Set<IntentCategory>();

  for (const { category, keywords } of INTENT_PATTERNS) {
    for (const kw of keywords) {
      if (kw.test(combinedText)) {
        detected.add(category);
        break;
      }
    }
  }

  // If nothing matched, mark as OTHER
  if (detected.size === 0) {
    detected.add('OTHER');
  }

  return Array.from(detected);
}

/**
 * Deterministically analyzes Actual Impact grounded in repository evidence:
 * - Changed files, line diffs
 * - Static analysis findings & sinks
 * - Reachability analysis & Auth boundaries
 * - Blast radius & dependency analysis
 */
export function analyzeIntentVsImpact(run: AnalysisRun): IntentImpactAnalysis {
  const title = run.pr.title || '';
  const description = run.pr.description || '';
  const declaredScope = extractDeclaredScope(title, description);

  const actualImpactMap = new Map<IntentCategory, IntentImpactEvidence[]>();

  function addEvidence(evidence: IntentImpactEvidence) {
    const list = actualImpactMap.get(evidence.area) || [];
    list.push(evidence);
    actualImpactMap.set(evidence.area, list);
  }

  // 1. Evidence from Changed Files
  const files = run.pr.files || [];
  files.forEach((f) => {
    const fn = f.filename.toLowerCase();
    if (fn.includes('package.json') || fn.includes('requirements.txt') || fn.includes('yarn.lock') || fn.includes('pom.xml')) {
      addEvidence({
        area: 'DEPENDENCY',
        file: f.filename,
        source: 'file_manifest',
        description: `Direct dependency manifest modified (${f.additions} added, ${f.deletions} removed).`,
      });
    }

    if (fn.includes('route') || fn.includes('api') || fn.includes('controller') || fn.includes('endpoint')) {
      addEvidence({
        area: 'API',
        file: f.filename,
        source: 'api_routing',
        description: `External HTTP routing interface modified in ${f.filename}.`,
      });
    }

    if (fn.includes('db') || fn.includes('database') || fn.includes('model') || fn.includes('schema') || fn.includes('sql')) {
      addEvidence({
        area: 'DATABASE',
        file: f.filename,
        source: 'db_layer',
        description: `Database access or persistence layer touched in ${f.filename}.`,
      });
    }

    if (fn.includes('auth') || fn.includes('jwt') || fn.includes('token') || fn.includes('permission') || fn.includes('login')) {
      addEvidence({
        area: 'AUTHENTICATION',
        file: f.filename,
        source: 'auth_subsystem',
        description: `Authentication / credential handling modified in ${f.filename}.`,
      });
    }

    if (fn.includes('test') || fn.includes('spec') || fn.includes('mock')) {
      addEvidence({
        area: 'TESTING',
        file: f.filename,
        source: 'test_suite',
        description: `Test assertions or mock verification updated in ${f.filename}.`,
      });
    }

    if (fn.includes('service') || fn.includes('payment') || fn.includes('coupon') || fn.includes('checkout') || fn.includes('order') || fn.includes('wallet')) {
      addEvidence({
        area: 'BUSINESS_LOGIC',
        file: f.filename,
        source: 'domain_logic',
        description: `Domain business logic touched in ${f.filename}.`,
      });
    }
  });

  // 2. Evidence from Static Analysis Findings & Sinks
  run.findings.forEach((f) => {
    if (f.status === 'FALSE_POSITIVE') return;

    if (f.reachability?.sensitive_sink === 'DATABASE' || f.rule_id.toLowerCase().includes('sql') || f.evidence.toLowerCase().includes('select')) {
      addEvidence({
        area: 'DATABASE',
        file: f.file,
        line: f.line_start,
        source: 'static_analysis_ast',
        description: `Database query execution sink detected: ${f.title}`,
      });
    }

    if (f.reachability?.crosses_auth_boundary === 'YES' || f.rule_id.toLowerCase().includes('auth') || f.rule_id.toLowerCase().includes('jwt')) {
      addEvidence({
        area: 'AUTHORIZATION',
        file: f.file,
        line: f.line_start,
        source: 'boundary_analysis',
        description: `Code crosses authorization boundary: ${f.title}`,
      });
    }

    if (f.category === 'DEPENDENCY' || f.source === 'dependency_check') {
      addEvidence({
        area: 'DEPENDENCY',
        file: f.file,
        line: f.line_start,
        source: 'vulnerability_database',
        description: `Dependency risk: ${f.title}`,
      });
    }

    if (f.category === 'SECURITY') {
      addEvidence({
        area: 'SECURITY',
        file: f.file,
        line: f.line_start,
        source: 'security_analyzer',
        description: `Security observation flagged: ${f.title}`,
      });
    }
  });

  // 3. Evidence from Blast Radius
  if (run.blast_radius.db_paths > 0) {
    if (!actualImpactMap.has('DATABASE')) {
      addEvidence({
        area: 'DATABASE',
        file: run.pr.files[0]?.filename || 'repository',
        source: 'blast_radius_detector',
        description: `Blast radius analysis identified ${run.blast_radius.db_paths} persistent storage path(s).`,
      });
    }
  }

  if (run.blast_radius.api_endpoints > 0) {
    if (!actualImpactMap.has('API')) {
      addEvidence({
        area: 'API',
        file: run.pr.files[0]?.filename || 'repository',
        source: 'blast_radius_detector',
        description: `Blast radius analysis identified ${run.blast_radius.api_endpoints} public endpoint(s).`,
      });
    }
  }

  // Compile unique actual impact areas
  const actualImpact = Array.from(actualImpactMap.keys());
  const allEvidence: IntentImpactEvidence[] = [];
  actualImpactMap.forEach((evList) => {
    allEvidence.push(...evList);
  });

  // Additional impact = areas in code not declared in PR title/description
  const additionalImpact = actualImpact.filter((area) => !declaredScope.includes(area));

  // Determine confidence
  let confidence: IntentImpactAnalysis['confidence'] = 'HIGH';
  if (allEvidence.length === 0) {
    confidence = 'INSUFFICIENT_EVIDENCE';
  } else if (allEvidence.length < 3) {
    confidence = 'MEDIUM';
  }

  const status: IntentImpactAnalysis['status'] =
    confidence === 'INSUFFICIENT_EVIDENCE'
      ? 'INSUFFICIENT_EVIDENCE'
      : additionalImpact.length > 0
      ? 'ADDITIONAL_IMPACT_DETECTED'
      : 'ALIGNED';

  // Summaries
  const declaredSummary = declaredScope.map((s) => s.replace('_', ' ').toLowerCase()).join(', ');
  const actualSummary = actualImpact.map((s) => s.replace('_', ' ').toLowerCase()).join(', ');

  return {
    id: `intent-${run.id}`,
    analysis_id: run.id,
    declared_scope: declaredScope,
    actual_impact: actualImpact,
    additional_impact: additionalImpact,
    confidence,
    status,
    declared_summary: declaredSummary,
    actual_summary: actualSummary,
    evidence: allEvidence,
    created_at: new Date().toISOString(),
  };
}
