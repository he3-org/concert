# Concert 3 Pipeline

This directory contains reference documentation for the Concert 3 pipeline.

## How It Works

Concert 3 uses **GitHub as the orchestrator** instead of LLM agents:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **State** | GitHub Issues + Labels | Track mission progress |
| **Orchestrator** | GitHub Actions | Deterministic state transitions |
| **Workers** | Copilot Coding Agent | Flat, independent work sessions |
| **Transitions** | GitHub Events | Label changes, issue closures |
| **Visibility** | GitHub Projects V2 | Board view, progress tracking |

## Pipeline Stages

```
Vision → Requirements → Architecture → [UX Design] → Planning → Execution → Complete
  ↑          ↑              ↑              ↑            ↑
  └──────────┴──────────────┴──────────────┴────────────┘
          /accept or /revise at each gate
```

## Commands

| Command | Where | What Happens |
|---------|-------|-------------|
| `/accept` | Parent issue comment | Approves current stage, triggers next |
| `/revise: <feedback>` | Parent issue comment | Creates revision sub-issue for Copilot |

## Labels (State Machine)

| Label | Meaning |
|-------|---------|
| `concert/mission` | Parent mission issue |
| `concert/*-pending` | Agent is working on a stage |
| `concert/*-review` | Stage ready for human review |
| `concert/*-accepted` | Stage approved, next stage triggered |
| `concert/execution` | Mission in execution phase |
| `concert/task` | Individual coding task |
| `concert/task-review` | Task code review |
| `concert/task-complete` | Task finished and reviewed |
| `concert/complete` | Mission finished |

## Quality Loop

```
Task assigned → Copilot codes → Review issue created → Copilot reviews
                                                          ↓
                                         PASS → Task complete → Next task
                                         NEEDS_FIX → Fix issue → Re-review (max 3 iterations)
```

## Crash Recovery

Since state lives in GitHub Issues (not a JSON file), recovery is simple:
1. Issue is still open → re-assign `@copilot`
2. Issue body still contains full instructions
3. No state to reconstruct or parse
