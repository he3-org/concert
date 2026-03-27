---
task: "types"
title: "Define all shared TypeScript types and interfaces"
depends_on: ["project-scaffold"]
wave: 2
model: haiku
---

## Objective

Create the shared TypeScript type definitions for state.json, concert.jsonc, task frontmatter, telemetry, failure blocks, and all other data structures used across the codebase.

## Files

- `src/types.ts`

## Requirements

- DR-001: concert-state.json Schema
- DR-002: concert.jsonc Configuration Schema
- DR-005: Telemetry Record Schema
- DR-006: Task File Frontmatter Schema

## Detailed Instructions

Define these interfaces and types in `src/types.ts`:

```typescript
// === State Schema (DR-001) ===

export interface ReviewFinding {
  severity: "CRIT" | "MAJ" | "MIN" | "NTH";
  file: string;
  line: number;
  issue: string;
  resolved: boolean;
}

export interface QualityLoopState {
  task_file: string;
  task_index: number;
  iteration: number;
  phase: "coder" | "reviewer";
  prior_findings: ReviewFinding[];
  coder_commits: string[];
}

export interface FailureBlock {
  phase: number;
  phase_name: string;
  task_file: string;
  task_index: number;
  task_title: string;
  failed_at: string; // ISO 8601
  error_type: ErrorType;
  error_summary: string;
  files_touched: string[];
  last_successful_commit: string;
}

export type ErrorType =
  | "test_failure"
  | "build_error"
  | "context_exhaustion"
  | "dependency_missing"
  | "model_capability_exceeded"
  | "timeout"
  | "unknown";

export interface DebugHypothesis {
  id: number;
  description: string;
  status: "pending" | "testing" | "confirmed" | "rejected";
  result?: string;
}

export interface DebugState {
  failure_ref: string;
  hypotheses: DebugHypothesis[];
  current_hypothesis: number;
  experiments_run: number;
}

export interface TelemetryRecord {
  task_file: string;
  task_index: number;
  phase: number;
  model_assigned: ModelTier;
  confidence: "high" | "medium" | "low";
  review_result: "PASS" | "NTH" | "MIN" | "MAJ" | "CRIT" | "none";
  revision_count: number;
  skills_loaded: string[];
  files_changed: number;
  completed_at: string; // ISO 8601
}

export interface FailureSummary {
  phase: number;
  task_file: string;
  task_index: number;
  error_type: ErrorType;
  error_summary: string;
  occurred_at: string; // ISO 8601
  resolved: boolean;
}

export interface HistoryEntry {
  action: string;
  timestamp: string;
  details: string;
}

export type PipelineStatus = "pending" | "draft" | "accepted";

export interface CostTracking {
  estimated_remaining: string;
  spent_this_mission: string;
  by_stage: Record<string, string>;
}

export interface ConcertState {
  // Identity
  mission: string;
  mission_path: string;
  workflow: string;
  workflow_path: string;
  branch: string;
  pr_number: number;
  status_display: string;
  feature_size: "small" | "medium" | "large";

  // Pipeline
  stage: string;
  pipeline: Record<string, PipelineStatus>;

  // Execution progress
  phases_completed: number;
  phases_total: number;
  tasks_completed: number;
  tasks_total: number;
  commits: number;
  current_phase?: number;
  current_task_file?: string;
  current_task_index?: number;

  // Cost tracking
  cost: CostTracking;

  // Active states (nullable)
  failure?: FailureBlock | null;
  debug_state?: DebugState | null;
  quality_loop_state?: QualityLoopState | null;

  // Logs
  blockers: string[];
  telemetry: TelemetryRecord[];
  failure_log: FailureSummary[];
  history: HistoryEntry[];
  next_steps: string[];
}

// === Config Schema (DR-002) ===

export type ModelTier = "haiku" | "sonnet" | "opus";

export interface ConcertConfig {
  project_name: string;
  concert_version: string;

  project: {
    platforms: string[];
  };

  git: {
    base_branch: string;
    production_branch: string;
    pre_v1: boolean;
    commit_format: string;
    pr_target: string;
  };

  status_display: string;
  interactive_mode: "claude_code_only" | "any";

  execution: {
    mode: string;
    max_tasks_per_file: number;
    max_files_per_phase: number;
    max_review_iterations?: number;
  };

  review_triggers: {
    on_phase_complete: boolean;
    on_dependency_boundary: boolean;
    on_inferred_breakpoint: boolean;
    after_n_files: number;
    after_n_commits: number;
  };

  gates: {
    task_checker: boolean;
    regression?: boolean;
    acceptance_testing: boolean;
  };

  model_profiles: {
    quality: string;
    balanced: string;
    budget: string;
  };

  task_models: {
    opus: string;
    sonnet: string;
    haiku: string;
  };

  skills: {
    auto_discover: boolean;
    enabled: string[];
  };

  actions: {
    auto_continue: boolean;
  };

  telemetry: {
    enabled: boolean;
    generate_cost_report: boolean;
  };

  self_improvement: {
    enabled: boolean;
  };

  user_guidance: {
    always_show_next_steps: boolean;
    include_file_paths: boolean;
    include_copy_paste_commands: boolean;
    show_both_cli_and_ui_options: boolean;
  };
}

// === Task Frontmatter (DR-006) ===

export interface TaskFrontmatter {
  task: string;
  title: string;
  depends_on: string[];
  wave: number;
  model: ModelTier;
}

// === Managed File Header ===

export const MANAGED_HEADER_PREFIX = "AUTO-GENERATED BY CONCERT";
export const MANAGED_HEADER_MD = (version: string) =>
  `<!-- ${MANAGED_HEADER_PREFIX} v${version} -- DO NOT EDIT. This file is managed by Concert and will be overwritten on \`concert update\`. -->`;
export const MANAGED_HEADER_YAML = (version: string) =>
  `# ${MANAGED_HEADER_PREFIX} v${version} -- DO NOT EDIT. This file is managed by Concert and will be overwritten on \`concert update\`.`;

// === CLAUDE.md Section Markers ===

export const CLAUDE_SECTION_START =
  "<!-- CONCERT:START -- DO NOT MODIFY THIS SECTION. It is managed by Concert and will be overwritten on `concert update`. -->";
export const CLAUDE_SECTION_END =
  "<!-- CONCERT:END -- DO NOT MODIFY THIS SECTION -->";
```

## Tests

- `src/__tests__/types.test.ts`: Import all types and verify they are defined (compile-time check). Create sample objects conforming to each interface and assert they match expected shapes.

## Acceptance Criteria

- [ ] All interfaces compile without errors
- [ ] `ConcertState` interface matches the schema in ARCHITECTURE.md Section 6
- [ ] `ConcertConfig` interface matches the schema in REQUIREMENTS.md DR-002
- [ ] `TaskFrontmatter` interface matches DR-006
- [ ] `TelemetryRecord` interface matches DR-005
- [ ] Managed header functions produce correct strings with version interpolation
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
