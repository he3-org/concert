# Concert 3

> **GitHub-native SDLC orchestration — AI as workers, not managers.**

Concert 3 replaces LLM-based orchestration with GitHub's deterministic infrastructure:

- **GitHub Issues** = state machine (reliable, persistent, visible)
- **GitHub Actions** = orchestrator (deterministic, event-driven, debuggable)
- **GitHub Projects** = dashboard (progress tracking, board views)
- **GitHub Sub-issues** = task hierarchy (phases, waves, progress bars)
- **Copilot Coding Agent** = worker (assigned issues, creates PRs, no nesting)

## The Key Insight

Concert 2 asked LLMs to do orchestration AND work. LLMs are great at work but
unreliable at orchestration. Concert 3 inverts the control — GitHub does the
orchestration deterministically, and LLMs focus purely on the work.

**Zero agent nesting. Ever.** Every agent invocation is a flat, independent
session triggered by a GitHub event.

## Quick Start

### 1. Start a Mission

Go to **Actions** → **🎵 Concert Init** → **Run workflow**

Enter:
- Mission name (e.g., "auth-service")
- Workflow size (full/medium/small)
- Brief description

### 2. Write Your Vision

Edit `.concert/missions/<slug>/VISION.md` on the created branch, then comment `/accept` on the mission issue.

### 3. Watch It Go

The pipeline runs automatically:

```
Vision → Requirements → Architecture → [UX Design] → Planning → Execution → Complete
  ↑          ↑              ↑              ↑            ↑
  └──────────┴──────────────┴──────────────┴────────────┘
          /accept or /revise at each gate
```

Each stage:
1. Copilot Coding Agent generates the document
2. You review and comment `/accept` or `/revise: <feedback>`
3. GitHub Actions advances to the next stage

### 4. Execution

Task planning creates individual issues, each assigned to Copilot:
- Tasks execute in wave order (respecting dependencies)
- Each task gets a code review
- Fix-review loops run automatically (up to 3 iterations)
- When all tasks complete, the mission is done!

## Commands

Comment on the mission issue:

| Command | Effect |
|---------|--------|
| `/accept` | Approve current stage, advance pipeline |
| `/revise: <feedback>` | Request revision with specific feedback |

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Issues (State)                      │
│  Mission Issue (Parent)                                       │
│  ├── Sub: Generate Requirements    ✅                        │
│  ├── Sub: Generate Architecture    ✅                        │
│  ├── Sub: Plan Tasks               ✅                        │
│  ├── Sub: TASK-01 setup            ✅                        │
│  ├── Sub: TASK-02 models           🔄 in progress            │
│  └── Sub: TASK-03 auth             ⬜ waiting                │
└─────────────┬───────────────────────────────────────────────┘
              │ GitHub Events (labeled, closed)
              ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions (Orchestrator)                    │
│  concert-orchestrator.yml  — Stage transitions               │
│  concert-execute.yml       — Task dispatch & quality loop    │
│  concert-review.yml        — /accept & /revise handling      │
│  concert-init.yml          — Mission creation                │
└─────────────┬───────────────────────────────────────────────┘
              │ Assigns issues to @copilot
              ▼
┌─────────────────────────────────────────────────────────────┐
│        Copilot Coding Agent (Flat Workers)                    │
│  - Reads issue body (complete instructions)                  │
│  - Reads .github/agents/*.agent.md (persona)                │
│  - Does work, creates/updates PR                             │
│  - Session ends. No nesting. No state propagation.           │
└─────────────────────────────────────────────────────────────┘
```

## Workflow Sizes

| Size | Stages | Best For |
|------|--------|----------|
| **Full** | Vision → Requirements → Architecture → UX → Planning → Execution | Large features, new systems |
| **Medium** | Vision → Requirements → Architecture → Planning → Execution | Medium features |
| **Small** | Vision → Requirements → Planning → Execution | Bug fixes, small changes |

## File Structure

```
.github/
├── workflows/
│   ├── concert-orchestrator.yml      # Main state machine
│   ├── concert-execute.yml           # Task dispatch & quality loop
│   ├── concert-review.yml            # /accept, /revise handling
│   └── concert-init.yml              # Mission creation
├── agents/
│   ├── concert-analyst.agent.md      # Requirements analyst
│   ├── concert-architect.agent.md    # Architecture planner
│   ├── concert-designer.agent.md     # UX designer
│   ├── concert-planner.agent.md      # Task decomposer
│   ├── concert-coder.agent.md        # TDD implementer
│   └── concert-reviewer.agent.md     # Code quality reviewer
├── instructions/
│   └── concert-conventions.instructions.md
└── ISSUE_TEMPLATE/
    └── concert-mission.yml

.concert/
├── templates/                        # Document templates
│   ├── VISION.md
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── UX.md
│   └── TASK.md
├── workflows/
│   └── README.md                     # Pipeline documentation
└── missions/                         # Mission data (gitkeep)

AGENTS.md                             # Project agent guidance
concert.jsonc                         # Configuration
```

## Why Concert 3?

| Concern | Concert 2 (LLM orchestration) | Concert 3 (GitHub orchestration) |
|---------|-------------------------------|----------------------------------|
| **Reliability** | LLMs fail silently at state management | GitHub Actions are deterministic |
| **Visibility** | Run `concert-status` to see progress | GitHub Issues visible everywhere |
| **Crash Recovery** | Manual — parse state.json | Re-assign issue to @copilot |
| **Nesting** | Agents call agents (fragile) | Zero nesting — all flat sessions |
| **Audit Trail** | History array in JSON | Full GitHub issue timeline |
| **Notifications** | None | GitHub notifications, email, mobile |
| **Board View** | None | GitHub Projects kanban/roadmap |

## License

MIT
