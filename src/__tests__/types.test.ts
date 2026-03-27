import { describe, it, expect } from "vitest";
import type {
  ConcertState,
  ConcertConfig,
  TaskFrontmatter,
  TelemetryRecord,
  FailureBlock,
  HistoryEntry,
  ReviewFinding,
  QualityLoopState,
  DebugState,
  DebugHypothesis,
} from "../types.js";
import {
  MANAGED_HEADER_PREFIX,
  MANAGED_HEADER_MD,
  MANAGED_HEADER_YAML,
  CLAUDE_SECTION_START,
  CLAUDE_SECTION_END,
} from "../types.js";

describe("types", () => {
  it("ConcertState interface can be instantiated", () => {
    const state: ConcertState = {
      mission: "test-mission",
      mission_path: "docs/concert/missions/test",
      workflow: "mission-full",
      workflow_path: "docs/concert/workflows/CONCERT-WORKFLOW-MISSION-FULL.md",
      branch: "concert/test",
      pr_number: 42,
      status_display: "wip_pr",
      feature_size: "large",
      stage: "execution",
      pipeline: { vision: "accepted", requirements: "accepted" },
      phases_completed: 1,
      phases_total: 5,
      tasks_completed: 3,
      tasks_total: 31,
      commits: 5,
      cost: {
        estimated_remaining: "$10",
        spent_this_mission: "$5",
        by_stage: { vision: "$1" },
      },
      blockers: [],
      telemetry: [],
      failure_log: [],
      history: [],
      next_steps: ["run something"],
    };
    expect(state.mission).toBe("test-mission");
    expect(state.pr_number).toBe(42);
    expect(state.feature_size).toBe("large");
  });

  it("ConcertConfig interface can be instantiated", () => {
    const config: ConcertConfig = {
      project_name: "my-project",
      concert_version: "0.1.0",
      project: { platforms: ["node"] },
      git: {
        base_branch: "main",
        production_branch: "main",
        pre_v1: true,
        commit_format: "conventional",
        pr_target: "main",
      },
      status_display: "wip_pr",
      interactive_mode: "claude_code_only",
      execution: {
        mode: "wave",
        max_tasks_per_file: 4,
        max_files_per_phase: 5,
        max_review_iterations: 3,
      },
      review_triggers: {
        on_phase_complete: true,
        on_dependency_boundary: true,
        on_inferred_breakpoint: true,
        after_n_files: 0,
        after_n_commits: 0,
      },
      gates: {
        task_checker: true,
        acceptance_testing: true,
      },
      model_profiles: {
        quality: "claude-opus-4-6",
        balanced: "claude-sonnet-4-6",
        budget: "claude-haiku-4-5",
      },
      task_models: {
        opus: "claude-opus-4-6",
        sonnet: "claude-sonnet-4-6",
        haiku: "claude-haiku-4-5",
      },
      skills: { auto_discover: true, enabled: [] },
      actions: { auto_continue: true },
      telemetry: { enabled: true, generate_cost_report: true },
      self_improvement: { enabled: true },
      user_guidance: {
        always_show_next_steps: true,
        include_file_paths: true,
        include_copy_paste_commands: true,
        show_both_cli_and_ui_options: true,
      },
    };
    expect(config.project_name).toBe("my-project");
    expect(config.interactive_mode).toBe("claude_code_only");
    expect(config.execution.max_review_iterations).toBe(3);
  });

  it("TaskFrontmatter interface can be instantiated", () => {
    const fm: TaskFrontmatter = {
      task: "my-task",
      title: "My Task Title",
      depends_on: ["prior-task"],
      wave: 2,
      model: "haiku",
    };
    expect(fm.task).toBe("my-task");
    expect(fm.model).toBe("haiku");
  });

  it("TelemetryRecord interface can be instantiated", () => {
    const record: TelemetryRecord = {
      task_file: "TASK-foo.md",
      task_index: 1,
      phase: 1,
      model_assigned: "sonnet",
      confidence: "high",
      review_result: "PASS",
      revision_count: 1,
      skills_loaded: ["typescript-standards"],
      files_changed: 3,
      completed_at: "2026-03-27T10:00:00Z",
    };
    expect(record.review_result).toBe("PASS");
  });

  it("FailureBlock interface can be instantiated", () => {
    const block: FailureBlock = {
      phase: 1,
      phase_name: "Foundation",
      task_file: "TASK-foo.md",
      task_index: 1,
      task_title: "Build foo",
      failed_at: "2026-03-27T10:00:00Z",
      error_type: "test_failure",
      error_summary: "Tests failed",
      files_touched: ["src/foo.ts"],
      last_successful_commit: "abc1234",
    };
    expect(block.error_type).toBe("test_failure");
  });

  it("ReviewFinding interface can be instantiated", () => {
    const finding: ReviewFinding = {
      severity: "MAJ",
      file: "src/foo.ts",
      line: 42,
      issue: "Missing null check",
      resolved: false,
    };
    expect(finding.severity).toBe("MAJ");
  });

  it("QualityLoopState interface can be instantiated", () => {
    const qls: QualityLoopState = {
      task_file: "TASK-foo.md",
      task_index: 1,
      iteration: 2,
      phase: "reviewer",
      prior_findings: [],
      coder_commits: ["abc1234"],
    };
    expect(qls.phase).toBe("reviewer");
  });

  it("DebugState and DebugHypothesis interfaces can be instantiated", () => {
    const hyp: DebugHypothesis = {
      id: 1,
      description: "The bug is in foo",
      status: "pending",
    };
    const debug: DebugState = {
      failure_ref: "failure-1",
      hypotheses: [hyp],
      current_hypothesis: 1,
      experiments_run: 0,
    };
    expect(debug.failure_ref).toBe("failure-1");
  });

  it("HistoryEntry interface can be instantiated", () => {
    const entry: HistoryEntry = {
      action: "mission_created",
      timestamp: "2026-03-27",
      details: "Created mission",
    };
    expect(entry.action).toBe("mission_created");
  });

  it("MANAGED_HEADER_PREFIX is correct", () => {
    expect(MANAGED_HEADER_PREFIX).toBe("AUTO-GENERATED BY CONCERT");
  });

  it("MANAGED_HEADER_MD generates correct string", () => {
    const header = MANAGED_HEADER_MD("0.1.0");
    expect(header).toContain("AUTO-GENERATED BY CONCERT v0.1.0");
    expect(header).toContain("concert update");
    expect(header.startsWith("<!--")).toBe(true);
  });

  it("MANAGED_HEADER_YAML generates correct string", () => {
    const header = MANAGED_HEADER_YAML("0.1.0");
    expect(header).toContain("AUTO-GENERATED BY CONCERT v0.1.0");
    expect(header.startsWith("#")).toBe(true);
  });

  it("CLAUDE_SECTION_START contains CONCERT:START", () => {
    expect(CLAUDE_SECTION_START).toContain("CONCERT:START");
  });

  it("CLAUDE_SECTION_END contains CONCERT:END", () => {
    expect(CLAUDE_SECTION_END).toContain("CONCERT:END");
  });
});
