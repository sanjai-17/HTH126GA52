# 🛡️ CODEGUARD — Deterministic AI Code Review & Release Intelligence

[![Tests](https://img.shields.io/badge/Tests-15%2F15%20Passing-brightgreen.svg)](#automated-specification-test-suite)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)

> **A developer-first Release Engineering Console & DevSecOps Platform for GitHub Pull Requests.**  
> CodeGuard replaces noisy alerts and hallucinated AI suggestions with **evidence-grounded code review**, **PR Intent vs. Actual Impact auditing**, **deterministic risk budgeting**, and a **Minimum Safe Patch Set optimization engine**.

---

## 📌 Executive Summary: The Problem CodeGuard Solves

Modern engineering teams face **Alert Fatigue and Release Paralysis**:
- **Raw SAST & Linter Noise**: Traditional scanners dump dozens of false alarms on developers without understanding contextual boundaries (e.g. test environments, internal mocks).
- **Hallucinated AI Suggestions**: Generic LLM assistants propose code fixes that break syntax, alter business logic, or introduce regression bugs.
- **The "Merge or Block?" Dilemma**: Engineering leads lack objective, mathematical criteria to decide whether a PR is safe enough to ship on deadline.

### 💡 The CodeGuard Solution
CodeGuard treats code review as an **engineering optimization problem**:
1. **Audits PR Intent vs. Actual Impact** to detect unannounced scope expansion (e.g. a dependency bump quietly altering authorization logic).
2. **Calculates a Deterministic Release Risk Score (0–100)** anchored on reachability, blast radius, and vulnerability severity.
3. **Calculates the Minimum Safe Patch Set**: Identifies the absolute smallest combination of fixes required to bring a PR within the team's release risk budget.
4. **Verifies Every Patch in Real Time**: Validates syntax, AST linting, and safety invariant tests before recommending any fix.

---

## ✨ Key Innovations & Features

### 1. 🎯 PR Intent vs. Actual Impact Engine
- **Declared Intent Extraction**: Extracts author intent from PR titles, descriptions, and branch semantics using semantic classification (`DEPENDENCY`, `AUTHENTICATION`, `DATABASE`, `API`, `BUSINESS_LOGIC`, `REFACTORING`, etc.).
- **Evidence-Grounded Impact Analysis**: Parses AST sinks, route handlers, database queries, and manifests to discover the *actual* blast radius.
- **Neutral, Respectful Reporting**: Identifies discrepancies objectively (`Additional impact detected`) with exact file paths and line numbers rather than subjective accusatory flags.

### 2. 🛡️ Deterministic Release Risk Engine & `ReleaseRiskLine`
- **0–100 Explainable Scoring**: Calculates release risk deterministically from:
  - Base vulnerability severity (Critical, High, Medium, Low).
  - Production reachability & execution path exposure.
  - Blast radius (files, modules, public API endpoints, database access paths).
- **Signature `ReleaseRiskLine` Visualization**: An interactive horizontal scale clearly marking:
  - Current PR Risk Score.
  - Team's Release Policy Budget Marker.
  - Real-time Counterfactual Projections when fixes are simulated.

### 3. 🧩 Minimum Safe Patch Set (Optimization Engine)
- **The Core Question Solved**: *"What is the minimum number of fixes my team must apply to safely ship this PR within our risk budget?"*
- **Mathematical Optimization**:
  - Employs a branch-and-bound search across all actionable findings.
  - Evaluates counterfactual risk reduction using the canonical risk engine.
  - Finds the minimum cardinality $k$ (smallest fix count) that satisfies $\text{Projected Risk} \le \text{Risk Budget}$.
  - Breaks ties gracefully using highest risk reduction, lower effort complexity (`LOW`, `MEDIUM`, `HIGH`), and verification confidence.
- **Zero Hallucination**: No fabricated developer hours; fixes are grounded in verifiable diffs.
- **One-Click Counterfactual Simulation**: Instantly loads the optimal patch set into the risk simulator.

### 4. ⚖️ Repository Release Policy & Risk Budgeting
- **Configurable Gates**:
  - Maximum allowable Release Risk Score (e.g., 40 / 100).
  - Maximum allowed Critical (0) and High (1) unresolved findings.
  - Requirement for verified patches and passing invariant tests on high-risk sinks.
- **Actionable Statuses**: `WITHIN_BUDGET`, `OVER_BUDGET`, `BLOCKED`, `VERIFICATION_REQUIRED`.
- **Live Policy Updates**: Modify risk budgets and thresholds via the Settings Console with instant persistence.

### 5. 🧪 Verified Autofix & Safety Invariant Test Runner
- **Multi-Stage Verification Checklist**:
  1. **Patch Integrity**: Validates unified diff application against the target AST.
  2. **Syntax Check**: Compiles and parses the modified code cleanly.
  3. **Static Analysis Check**: Ensures the patch does not introduce new vulnerabilities.
  4. **Invariant Regression Tests**: Generates and executes safety invariant unit tests (e.g. verifying SQL injection prevention with parameterized queries).

### 6. 🧠 Contextual False-Positive Shield & Repository Memory
- **Smart Suppression**: Identifies test harnesses, sandbox environments, and sanitized input sinks to suppress non-actionable findings.
- **Repository Memory**: Retains team-specific conventions, approved libraries, and developer feedback history to avoid repeating false warnings.

### 7. 📊 Ground-Truth Evaluation Benchmark
- Real-time benchmark comparison showing:
  - **Precision & Recall** vs. raw static tools.
  - **False Positive Reduction Rate** (typically 60%+ noise reduction).
  - **F1 Score** improvements across standard vulnerability test suites.

---

## 🚀 Interactive Demo Walkthrough (Scenario 5 Guide)

Follow this step-by-step guide to demonstrate the full power of CodeGuard in under 3 minutes:

### Step 1: Open Demo PR #5
1. Navigate to the top navigation bar and click **Analyze PR**.
2. Select **Demo Scenario 5**:  
   `chore(deps): Upgrade core libraries & refactor promo discount redemption`

### Step 2: Inspect PR Intent vs. Actual Impact (Overview Page)
1. On the **Overview** dashboard, look at the **PR Intent vs Actual Impact** card:
   - **Declared Scope**: `dependency`, `business logic`, `refactoring`.
   - **Actual Impact**: `dependency`, `business logic`, `database`, `api`, `authorization`.
   - **Status**: ⚠️ `Additional impact detected`.
2. Click **View evidence** to show the exact lines where unannounced database queries and public endpoints were touched in `src/services/coupon.ts` and `src/routes/checkout.ts`.

### Step 3: Review Release Risk Cockpit & Policy Gate
1. Notice the **Release Risk Score**: **64 / 100 (HIGH)**.
2. Check the **Repository Policy Gate**:
   - Policy Budget: **40 points**.
   - Current Status: **OVER BUDGET by +24 points**.
   - The PR is blocked from merging.

### Step 4: Run the Minimum Safe Patch Set Optimizer
1. Click **Find minimum safe patch →** or open the **Risk Analysis** tab.
2. Scroll to **Minimum Safe Patch Set**:
   - The engine analyzes all findings and identifies that fixing just **2 critical issues** (SQL injection vulnerability + coupon logic bug) drops risk by **-34 points** to **30 / 100**.
   - Risk drops from **64 → 30** (well below the 40-point budget)!
3. Click **Simulate minimum safe patch**:
   - The `ReleaseRiskLine` instantly shifts into the green `WITHIN BUDGET` zone.

### Step 5: Verify the Fixes
1. Navigate to **Findings** or **Fix Verification**.
2. Open the Monaco side-by-side Diff Editor.
3. Click **Verify Fix** to watch the multi-stage checklist execute:
   - Syntax validation: ✅ Pass
   - Static analysis: ✅ Clean
   - Invariant safety test: ✅ Pass

---

## 🏗️ System Architecture

```
codeguard/
├── server/                           # Backend Node/Express API & Engines
│   ├── analyzers.ts                  # Static analyzer orchestrator (Semgrep, Bandit, Ruff, ESLint)
│   ├── demoScenarios.ts              # Canonical PR scenarios (Demo 1 to 5)
│   ├── evaluationEngine.ts           # Ground-truth precision/recall benchmark engine
│   ├── falsePositiveShield.ts        # Contextual false-positive suppression rules
│   ├── fixVerifier.ts                # Invariant test execution & patch verifier
│   ├── intentImpactEngine.ts         # AST diff scope extractor & intent matcher
│   ├── llmProvider.ts                # Local AI / Ollama integration with deterministic fallback
│   ├── minimumSafePatchEngine.ts     # Branch-and-bound minimum safe patch optimizer
│   ├── releasePolicyService.ts       # Release policy evaluator & risk budget store
│   ├── repositoryMemoryService.ts    # Repository rules & developer feedback store
│   ├── riskEngine.ts                 # Deterministic 0-100 scoring & counterfactual simulator
│   ├── stackTraceService.ts          # Stack trace correlation engine
│   └── routes.ts                     # Express REST API routes
├── src/                              # React 19 Client Dashboard
│   ├── components/                   # UI components (RiskLine, PatchDiff, Header, etc.)
│   ├── pages/
│   │   ├── Overview.tsx              # Executive risk cockpit, intent vs impact, top fixes
│   │   ├── Findings.tsx              # Interactive findings table, filters, and code inspector
│   │   ├── RiskAnalysis.tsx          # Policy gate, minimum safe patch, counterfactual simulator
│   │   ├── FixVerification.tsx       # Monaco diff editor, autofix generator, invariant runner
│   │   ├── Evaluation.tsx            # Ground-truth precision/recall benchmark dashboard
│   │   └── Settings.tsx              # Release policy thresholds, Ollama health, engine config
│   ├── services/api.ts               # Type-safe API client
│   └── types/index.ts                # Shared TypeScript domain models
├── test/
│   └── runTests.ts                   # 15 automated specification tests
├── server.ts                         # Production & development Express server entry point
├── vite.config.ts                    # Vite build configuration
├── package.json                      # Project dependencies & scripts
└── tsconfig.json                     # TypeScript configuration
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze/demo` | Load one of the 5 canonical demo PR scenarios |
| `POST` | `/api/analyze/url` | Ingest and analyze a public GitHub Pull Request URL |
| `POST` | `/api/analyze/diff` | Analyze a raw unified diff patch directly |
| `GET` | `/api/analysis/:id` | Fetch full analysis run payload by ID |
| `GET` | `/api/analysis/:id/intent-impact` | Retrieve PR Intent vs. Actual Impact audit and evidence |
| `GET` | `/api/analysis/:id/policy-check` | Evaluate PR against active repository release policy |
| `POST` | `/api/risk/minimum-safe-patch` | Calculate optimal minimal subset of fixes to reach budget |
| `POST` | `/api/risk/simulate` | Simulate counterfactual risk score with selected resolved findings |
| `GET` | `/api/policy` | Fetch active repository release policy & budget thresholds |
| `POST` | `/api/policy` | Update release policy (risk budget, blocker limits) |
| `POST` | `/api/findings/:id/verify-fix` | Execute 4-stage syntax, lint, and invariant verification |
| `POST` | `/api/findings/:id/generate-fix` | Generate unified diff patch for a specific finding |
| `POST` | `/api/findings/:id/generate-test` | Generate unit test code enforcing safety invariant |
| `GET` | `/api/evaluation` | Run precision, recall, and noise-reduction benchmarks |
| `GET` | `/api/health` | Check health of analyzer tools and AI backend |
| `GET` | `/api/settings` | Retrieve active system configuration and tool statuses |

---

## 🧪 Automated Specification Test Suite

CodeGuard includes a formal automated specification test suite (`test/runTests.ts`) verifying all core algorithms:

```bash
npm run test
```

### Verified Test Cases (15/15 Passing):
1. **Minimum Safe Patch (Single Fix)**: Confirms 1 fix suffices when a high-impact finding brings risk below budget.
2. **Minimum Safe Patch (Multiple Fixes)**: Confirms optimal combination selection when multiple fixes are strictly required.
3. **No Possible Solution**: Confirms graceful reporting when available fixes cannot meet an impossibly tight budget.
4. **Already Within Budget**: Handles scenarios where the initial PR risk already satisfies team policy (0 fixes needed).
5. **Risk Calculation Consistency**: Validates that counterfactual simulator matches real-world findings risk math.
6. **Risk Budget Pass Evaluation**: Asserts `WITHIN_BUDGET` status when score $\le$ budget.
7. **Risk Budget Fail Evaluation**: Asserts `OVER_BUDGET` status with exact excess delta calculation.
8. **Critical Finding Blocker Policy**: Ensures any unverified critical finding immediately triggers `BLOCKED` status.
9. **Verification-Required Policy**: Flags unverified patches on sensitive database/auth paths.
10. **Intent Extraction**: Validates semantic parsing of PR titles and descriptions.
11. **Actual Impact Extraction**: Validates AST sink and route file impact detection.
12. **Intent/Impact Comparison**: Accurately flags undeclared impact categories with evidence.
13. **Insufficient Evidence Handling**: Gracefully reports neutral state when PR description lacks explicit scope.
14. **Demo Mode Stability**: Validates deterministic demo analysis generation across all scenarios.
15. **Regression Protection**: Ensures existing findings and blast radius calculations remain backward-compatible.

---

## 💻 Getting Started Locally

### Prerequisites
- **Node.js**: `v20.x` or higher recommended (compatible with `v18+`)
- **npm** or **bun** / **pnpm**

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/your-username/codeguard.git
cd codeguard

# 2. Install dependencies
npm install
```

### Running in Development Mode
Starts the Express API server and Vite client on port 3000:
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### Running Tests
Execute the automated test suite:
```bash
npm run test
```

### Building for Production
```bash
# Compile client bundle and build assets
npm run build

# Start production server
npm start
```

---

## ⚙️ Configuration & Environment Variables

Copy `.env.example` to `.env` to configure optional integrations:

```env
# Server Port
PORT=3000

# AI Provider (ollama | demo)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
DEMO_MODE=false

# Optional GitHub API Token (for higher rate limits on public PR analysis)
GITHUB_TOKEN=

# Policy Defaults
RISK_THRESHOLD_HIGH=60
RISK_THRESHOLD_CRITICAL=80
```

> **Note**: CodeGuard runs in full **Deterministic Offline / Demo Mode** out of the box with zero external dependencies or API keys required. You can connect a local Ollama instance (`ollama run qwen2.5-coder`) for live LLM review anytime.

---

## 🏆 Presentation Highlights for Reviewers

When presenting CodeGuard to evaluators or stakeholders, highlight these core pillars:

1. **Not Another Chatbot**: CodeGuard is not a generic conversational wrapper; it is an intelligent **Release Engineering Console**.
2. **Deterministic & Trustworthy**: Risk calculations and policy evaluations are 100% deterministic and mathematically explainable.
3. **Optimized for Developer Speed**: Instead of handing developers a list of 100 warnings, the **Minimum Safe Patch Set** tells them the exact 1 or 2 verified fixes needed to ship on time.
4. **Protects Production**: The **PR Intent vs. Actual Impact** engine guards against stealthy bugs and accidental scope creep before they hit production.
