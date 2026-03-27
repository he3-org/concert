---
task: "default-state-and-config"
title: "Create default state.json and concert.jsonc templates"
depends_on: ["types"]
wave: 3
model: haiku
---

## Objective

Create the default/empty state.json and concert.jsonc files that will be used as templates during `concert init`. These are the canonical defaults that new installations start with.

## Files

- `templates/docs/concert/state.json`
- `templates/concert.jsonc`

## Requirements

- DR-001: concert-state.json Schema
- DR-002: concert.jsonc Configuration Schema
- FR-001: Repository Bootstrapping via npx

## Detailed Instructions

### templates/docs/concert/state.json

Create an empty/initial state file with all fields at their defaults:

```json
{
  "mission": "",
  "mission_path": "",
  "workflow": "",
  "workflow_path": "",
  "branch": "",
  "pr_number": 0,
  "status_display": "wip_pr",
  "feature_size": "",
  "stage": "",
  "pipeline": {},
  "phases_completed": 0,
  "phases_total": 0,
  "tasks_completed": 0,
  "tasks_total": 0,
  "commits": 0,
  "cost": {
    "estimated_remaining": "",
    "spent_this_mission": "",
    "by_stage": {}
  },
  "blockers": [],
  "telemetry": [],
  "failure_log": [],
  "history": [],
  "next_steps": [
    "Run /concert:init to start a new mission"
  ]
}
```

### templates/concert.jsonc

Create the default configuration with comments explaining each field. Use the current concert.jsonc from the repo as the reference, adding the `interactive_mode` and `max_review_iterations` fields:

```jsonc
{
  // Concert configuration — see https://github.com/he3-org/concert
  "project_name": "",
  "concert_version": "0.1.0",

  "project": {
    "platforms": []
  },

  "git": {
    "base_branch": "main",
    "production_branch": "main",
    "pre_v1": true,
    "commit_format": "conventional",
    "pr_target": "main"
  },

  "status_display": "wip_pr",

  // Controls where interactive agents (concert-init, concert-review) can run.
  // "claude_code_only" (default): interactive agents refuse to run in GitHub Agents UI.
  // "any": interactive agents attempt to run in any environment.
  "interactive_mode": "claude_code_only",

  "execution": {
    "mode": "wave",
    "max_tasks_per_file": 4,
    "max_files_per_phase": 5,
    "max_review_iterations": 3
  },

  "review_triggers": {
    "on_phase_complete": true,
    "on_dependency_boundary": true,
    "on_inferred_breakpoint": true,
    "after_n_files": 0,
    "after_n_commits": 0
  },

  "gates": {
    "task_checker": true,
    "regression": true,
    "acceptance_testing": true
  },

  "model_profiles": {
    "quality": "claude-opus-4-6",
    "balanced": "claude-sonnet-4-6",
    "budget": "claude-haiku-4-5-20251001"
  },

  "task_models": {
    "opus": "claude-opus-4-6",
    "sonnet": "claude-sonnet-4-6",
    "haiku": "claude-haiku-4-5-20251001"
  },

  "skills": {
    "auto_discover": true,
    "enabled": []
  },

  "actions": {
    "auto_continue": true
  },

  "telemetry": {
    "enabled": true,
    "generate_cost_report": true
  },

  "self_improvement": {
    "enabled": true
  },

  "user_guidance": {
    "always_show_next_steps": true,
    "include_file_paths": true,
    "include_copy_paste_commands": true,
    "show_both_cli_and_ui_options": true
  }
}
```

## Tests

- Verify the state.json is valid JSON (parseable)
- Verify the concert.jsonc is valid JSONC (parseable with jsonc-parser)
- Verify both files match their respective TypeScript interfaces (type-level check)

## Acceptance Criteria

- [ ] `templates/docs/concert/state.json` exists and is valid JSON
- [ ] `templates/concert.jsonc` exists and is valid JSONC
- [ ] State file contains all fields defined in `ConcertState` interface with appropriate defaults
- [ ] Config file contains all fields defined in `ConcertConfig` interface with appropriate defaults
- [ ] Config file includes the `interactive_mode` field with default `"claude_code_only"`
- [ ] Config file includes `execution.max_review_iterations` with default `3`
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
