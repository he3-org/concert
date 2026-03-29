# UX Design: Concert 2 v1

## 1. Design Principles

Concert 2's "interface" is three things: a 3-command CLI, agent conversations in Claude Code / GitHub Agents UI, and a WIP PR body on GitHub. There is no graphical UI. Every design decision below serves one goal: **a single developer on a low-power Chromebook should always know where they are, what just happened, and what to do next.**

### Core Principles

1. **Every output ends with next steps.** No agent output, CLI output, or PR body update should leave the user wondering "now what?" Next steps include copy-paste commands for both CLI and web UI.
2. **One thing at a time.** Interviews ask one question. Reviews present one concern. The pipeline advances one stage. Cognitive load stays minimal.
3. **State is always recoverable.** `concert-status` from a blank session reconstructs full context. The WIP PR shows pipeline progress at a glance. `concert-push` preserves mid-loop state for cross-environment handoff.
4. **Text is the medium.** All output is plain text / markdown. No spinners in agent conversations. No color-dependent information. Screen readers and piped output work correctly.
5. **Silent success, loud failure.** Successful operations are brief. Failures get full context: what failed, why, and exactly how to fix it.

---

## 2. User Flows

### 2.1 New Project Setup

**Trigger:** Developer wants to add Concert to an existing repository.

```
Terminal (any environment)
  |
  v
$ npx @he3-org/concert init
  |
  |- Verify git repo
  |- Copy template files
  |- Create state.json, concert.jsonc
  |- Print summary + next steps
  |
  v
User opens Claude Code (web UI or CLI)
  |
  v
/concert:init
  |
  |- Interview: one question at a time (5-8 questions)
  |- Propose feature size, confirm
  |- Summarize vision, confirm
  |- Write VISION.md
  |- Create branch (or detect existing)
  |- Create WIP PR
  |- Update state.json
  |- Commit
  |- Print next steps
```

**Key UX decisions:**
- The npm `concert init` is non-interactive. It copies files and exits. No LLM needed.
- The agent `concert-init` is interactive-only. It refuses to run in GitHub Agents UI with a clear redirect message.
- The two steps (npm init, then agent init) are distinct. The npm command sets up files; the agent creates the first mission.

### 2.2 Planning Pipeline

**Trigger:** After vision is accepted, the user advances through requirements, architecture, UX, and tasks.

```
For each planning stage:

/concert:plan
  |
  |- Auto-detect current stage from state.json
  |- Spawn the appropriate consultant agent
  |- Agent reads prior docs + codebase
  |- Agent produces draft document
  |- Update state.json (pipeline.<stage> = "draft")
  |- Commit
  |- Print next steps: review, accept, or restart
  |
  v
/concert:review
  |
  |- Phase 1: "Do you have any changes?"
  |   |- User says changes -> apply one at a time
  |   |- User says no changes -> move to Phase 2
  |
  |- Phase 2: Reviewer's own concerns
  |   |- Present one concern at a time by severity (CRIT > MAJ > MIN > NTH)
  |   |- Discuss and resolve each before next
  |   |- Commit after changes
  |
  |- Print next steps: accept or review again
  |
  v
/concert:accept
  |
  |- Copy plan doc to *-SPEC.md
  |- Update state.json (pipeline.<stage> = "accepted")
  |- Update WIP PR body
  |- Commit
  |- Print next steps: /concert:continue to advance, /concert:status to check
  |
  v
/concert:continue
  |
  |- Read state.json to determine what's next
  |- Advance stage to next per workflow
  |- Run the appropriate consultant agent (for planning stages)
  |- Or update state for execution (but don't auto-run)
  |- Print next steps
```

**Key UX decisions:**
- `concert-plan` auto-selects the stage. No argument needed for the common case. Explicit stage argument available for overrides.
- Review is two-phase to respect user priorities. The reviewer never buries the user's concerns under its own.
- Each review concern is discussed individually. No walls of text.

### 2.3 Execution

**Trigger:** After tasks stage is accepted, the user runs phases.

```
/concert:continue
  |
  |- Read state.json for execution position
  |- For each task in current phase:
  |   |
  |   |- Spawn Coder (model from task frontmatter)
  |   |   |- TDD: tests -> implement -> verify
  |   |   |- Commit
  |   |
  |   |- Spawn Reviewer (balanced model)
  |   |   |- Rate findings: CRIT/MAJ/MIN/NTH/PASS
  |   |
  |   |- If CRIT/MAJ: re-spawn Coder with findings
  |   |- Repeat up to max_review_iterations
  |   |
  |   |- Update state.json after each task
  |   |- Update PHASE-SUMMARY
  |
  |- After all tasks in phase:
  |   |- Run Documentation Agent
  |   |- Update WIP PR body
  |
  |- Print phase summary + next steps
```

**Key UX decisions:**
- Execution is autonomous. The user starts it and checks back.
- State is committed after every task for crash safety.
- On failure, execution stops immediately with full failure context.

### 2.4 Cross-Environment Handoff

**Trigger:** CC plan usage exhausted, GitHub session timeout, or user wants to switch environments.

```
Claude Code (plan exhausted — session just stops)
  |
  v
User runs: npx @he3-org/concert push
  |
  |- Commit uncommitted state changes
  |- Push branch to origin
  |- Print: branch, commits, loop state
  |- Print: "Run concert-continue in GitHub Agents UI"
  |
  v
GitHub Agents UI
  |
  |- User selects concert-continue agent
  |- Agent reads state.json
  |- Detects quality_loop_state -> resumes at exact position
  |- Continues execution
```

**Key UX decisions:**
- `concert push` is a pure Node CLI command. No LLM session required. This is critical because the most common trigger is exhausted plan usage.
- The handoff message tells the user exactly which agent to run and what model to select.
- The reverse handoff (GitHub -> CC) works identically: push from GitHub, continue in CC.

### 2.5 Cold-Start Recovery

**Trigger:** User opens a new browser tab, doesn't remember where they left off.

```
/concert:status
  |
  |- Read state.json (read-only, no modifications)
  |- Display structured status report
  |- Print next steps with copy-paste commands
```

This is the single most important UX pattern in Concert. It must work from any environment, on any model, in under 30 seconds.

### 2.6 Update Flow

**Trigger:** New Concert version available.

```
$ npx @he3-org/concert update
  |
  |- Compare managed file versions
  |- Overwrite outdated managed files
  |- Surgical merge of concert.jsonc (add new fields, preserve user values)
  |- Surgical merge of state.json (add new schema fields)
  |- Print summary: files updated, fields added/removed
  |- Print next steps
```

---

## 3. CLI Output Design

The npm package has exactly 3 commands. Each produces structured, predictable output.

### 3.1 Output Structure Convention

All CLI output follows this structure:

```
<header line>

<body — operation details>

<next steps>
```

- Header: one line summarizing what happened.
- Body: details of the operation, indented or bulleted.
- Next steps: always present, always last, always actionable.

### 3.2 `concert init`

**Success output:**

```
Concert initialized in /home/user/my-project

  Created:
    .claude/agents/          (14 agent definitions)
    docs/concert/workflows/       (8 workflow files)
    .claude/skills/          (7 skill files)
    docs/concert/state.json       (empty state)
    .github/agents/               (14 GitHub agent stubs)
    .github/workflows/            (2 workflow files)
    .claude/commands/             (13 skill commands)
    concert.jsonc                 (default configuration)
    CLAUDE.md                     (Concert section appended)

  Next steps:
    1. Review concert.jsonc and adjust configuration if needed
    2. Start a mission:
       Claude Code:  /concert:init
       CLI:          Run /concert:init in a Claude Code session
```

**Error — not a git repo:**

```
Error: not a git repository
  Concert requires a git repository. Initialize one first.

  Fix:
    git init && git commit --allow-empty -m "chore: initial commit"
    npx @he3-org/concert init
```

**Error — already initialized:**

```
Warning: Concert files already exist in this repository

  Existing files found:
    docs/concert/    (14 agents, 8 workflows)
    concert.jsonc    (user configuration)

  Options:
    Update managed files:  npx @he3-org/concert update
    Abort:  no action needed
```

### 3.3 `concert update`

**Success output:**

```
Concert updated to v0.4.0 (was v0.3.0)

  Updated managed files:
    .claude/agents/concert-continue.md  (v0.3.0 -> v0.4.0)
    .claude/agents/concert-reviewer.md  (v0.3.0 -> v0.4.0)
    docs/concert/workflows/CONCERT-WORKFLOW-EXECUTION.md  (v0.3.0 -> v0.4.0)

  Skipped (already current):
    .claude/agents/concert-init.md      (v0.4.0)
    ... (11 more files)

  Configuration merged (concert.jsonc):
    Added:   execution.max_review_iterations (default: 3)
    Removed: deprecated_field

  State schema updated (state.json):
    Added:   quality_loop_state (default: null)

  Next steps:
    1. Review concert.jsonc for new configuration options
    2. Continue your mission:  /concert:status
```

**Already current:**

```
Concert is up to date (v0.4.0)

  All 43 managed files are at the current version.
  No configuration changes needed.

  Next steps:
    1. Continue your mission:  /concert:status
```

### 3.4 `concert push`

**Success output:**

```
Pushed to origin/concert/my-feature

  Branch:   concert/my-feature
  Commits:  1 new commit pushed
  State:    quality_loop_state saved (reviewer, iteration 2)

  Next steps:
    1. Continue in GitHub Agents UI:
       Agent:  concert-continue
       Model:  sonnet (matches current task tier)
       The agent will resume from reviewer iteration 2 of TASK-02-auth-middleware-sonnet.md
```

**Nothing to push:**

```
Already up to date with origin/concert/my-feature

  No uncommitted changes. Branch is current with origin.

  Next steps:
    1. Continue work:
       Claude Code:  /concert:continue
       GitHub UI:    Run concert-continue agent
```

**Error — no branch:**

```
Error: no branch to push
  state.json has no branch recorded. Start a mission first.

  Fix:
    /concert:init
```

---

## 4. Agent Conversation Patterns

### 4.1 Interview Flow (concert-init)

The interview agent asks one question at a time. Each answer may change the next question. The agent adapts to the user's communication style — brief answers get targeted follow-ups, detailed answers skip redundant questions.

**Pattern:**

```
Agent: What are you building? Give me a brief description of the project or feature.

User: A CLI tool that converts markdown to PDF.

Agent: Who is the primary user of this tool?

User: Me, for generating reports from my notes.

Agent: What problem does this solve — what's painful about your current workflow?

User: I currently copy-paste into Google Docs which is slow and loses formatting.

Agent: What are the key constraints? Think about: technology choices, deployment,
       performance requirements, or existing systems this must integrate with.

User: Must work offline, Node.js, no heavy dependencies.

Agent: Based on what you've described, I'd classify this as a **small** feature:
       - Single CLI command
       - Clear input/output
       - No complex state management
       - Solo user

       Does "small" feel right, or is there complexity I'm missing?

User: That's right.

Agent: Here's my summary of your vision:

       **Problem:** Converting markdown notes to PDF requires manual copy-paste
       into Google Docs, which is slow and loses formatting.

       **Solution:** A Node.js CLI tool that converts markdown files to PDF locally,
       preserving formatting, with minimal dependencies and offline support.

       **User:** Single developer (you) generating reports from notes.

       **Size:** Small (vision -> tasks -> execution)

       Shall I write this up as the VISION.md, or would you like to adjust anything?

User: Looks good, write it up.

Agent: [writes VISION.md, creates branch, creates WIP PR, updates state.json, commits]

       Done. Mission created: 2026-03-28-md-to-pdf

       Files created:
         docs/concert/missions/2026-03-28-md-to-pdf/VISION.md

       Next steps:
         1. Review the vision:       /concert:review
         2. Accept the vision:        /concert:accept
         3. Check status:            /concert:status
```

**Key patterns:**
- One question per message. Never a numbered list of questions.
- Confirmation before writing. The agent summarizes and waits.
- Adaptive flow. If the user volunteers constraint info in the description, the agent skips the constraints question.
- Feature size is proposed, not asked as an open question.

### 4.2 Review Flow (concert-review)

Reviews use a strict two-phase flow. Phase 1 ensures the user's priorities are addressed first. Phase 2 presents the reviewer's concerns one at a time by severity.

**Phase 1 — User Changes:**

```
Agent: I've read the REQUIREMENTS.md draft. Before I share my review,
       do you have any changes you'd like to make?

User: Yes, FR-012 should be "must" priority, not "should".

Agent: Updated FR-012 priority to "must". Any other changes?

User: Add a requirement for offline support.

Agent: Added FR-035: Offline Support (must) with acceptance criteria for
       local-only operation. Any other changes?

User: No, that's everything.
```

**Phase 2 — Reviewer Concerns:**

```
Agent: Thanks. I have 3 concerns to discuss, ordered by importance.

       [1/3] IMPORTANT: FR-008 specifies "exactly one commit per task" but
       the TDD workflow (write test, implement, refactor) naturally produces
       multiple commits. The coder would need to squash, which adds complexity.

       Suggestion: Allow the coder to make multiple commits during TDD,
       with a squash at task completion.

       What do you think?

User: Good point. Let's allow multiple commits during TDD but require a
      single squash commit at the end.

Agent: Updated FR-008 to specify squash-on-completion. Committed.

       [2/3] SUGGESTION: FR-019 (Verification) doesn't specify what happens
       when verification finds failures. Should it generate remediation tasks
       automatically?

User: Yes, add that. Failed requirements should generate gap-closure task files.

Agent: Added to FR-019: "Failed/partial requirements generate suggested
       gap-closure task files." Committed.

       [3/3] SUGGESTION: The edge cases section doesn't cover what happens
       when a user runs concert-accept on an already-accepted stage.

User: Make it a warning, not an error. Idempotent.

Agent: Added EC-009 for that case. Committed.

       Review complete. All concerns resolved.

       Next steps:
         1. Accept requirements:     /concert:accept
         2. Review again:            /concert:review
         3. Restart from scratch:    /concert:restart
```

**Key patterns:**
- Phase 1 always comes first. Even if the reviewer has critical concerns, the user's changes are handled first.
- One concern at a time with a counter (e.g., `[2/3]`). The user always knows how many remain.
- Each concern has a severity label and a concrete suggestion.
- Commits happen after changes are applied, not at the end.

### 4.3 Status Report (concert-status)

The status report is designed for cold-start recovery. A developer opening a fresh browser tab should know everything they need within 30 seconds.

**Format:**

```
Concert Status: concert2-v1

  Pipeline:
    [x] Vision        accepted
    [x] Requirements  accepted
    [x] Architecture  accepted
    [ ] UX            draft
    [ ] Tasks         pending

  Current stage: UX (draft)
  Branch: concert/concert2-v1
  PR: #42

  Execution: not started
  Feature size: large

  Recent history:
    2026-03-26  Architecture accepted, advancing to UX
    2026-03-26  Architecture reviewed: added branch strategy, PR merge gate
    2026-03-26  Architecture drafted: 17 sections

  Next steps:
    1. Review the UX draft:
       Claude Code:  /concert:review
    2. Accept UX:
       Claude Code:  /concert:accept
    3. After accepting, advance to tasks:
       Claude Code:  /concert:continue
    4. Check the WIP PR:
       https://github.com/he3/concert2/pull/42
```

**During execution:**

```
Concert Status: my-feature

  Pipeline:
    [x] Vision        accepted
    [x] Requirements  accepted
    [x] Architecture  accepted
    [x] UX            accepted
    [x] Tasks         planned

  Execution: Phase 2 of 4 — "API endpoints"
    Tasks: 8/22 completed (36%)
    Current: TASK-02-auth-middleware-sonnet.md (task 2/4)
    Quality loop: reviewer, iteration 2

  Branch: concert/my-feature
  PR: #87

  Recent history:
    2026-03-28  Task 8 completed: user-routes (sonnet, PASS, 1 iteration)
    2026-03-28  Task 7 completed: db-queries (haiku, PASS, 1 iteration)
    2026-03-28  Task 6 completed: schema-types (haiku, NTH, 2 iterations)

  Next steps:
    1. Continue execution:
       Claude Code:  /concert:continue
       GitHub UI:    Run concert-continue with sonnet
    2. Check the WIP PR:
       https://github.com/he3/my-project/pull/87
```

**With failure:**

```
Concert Status: my-feature

  Pipeline:
    [x] Vision        accepted
    [x] Requirements  accepted
    [x] Tasks         planned

  Execution: FAILED at Phase 1, Task 3
    Tasks: 2/12 completed (16%)
    Failed: TASK-03-payment-handler-sonnet.md (task 3)
    Error: test_failure — PaymentService.charge() returns undefined
    Failed at: 2026-03-28T14:32:00Z
    Last good commit: abc1234

  Branch: concert/my-feature
  PR: #87

  Next steps:
    1. Debug the failure:
       Claude Code:  /concert:debug
       GitHub UI:    Run concert-debug with sonnet
    2. Or continue (retry the failed task):
       Claude Code:  /concert:continue
       GitHub UI:    Run concert-continue with sonnet
```

**Key patterns:**
- Pipeline visualization uses `[x]` / `[ ]` checkboxes. Universally understood, screen-reader friendly.
- Execution progress shows completion percentage and current position.
- Failure blocks include the error type, summary, and last good commit.
- Next steps always include both CLI and web UI options.

### 4.4 Failure Reporting

When execution fails, the output provides structured diagnostic information:

```
FAILED: Task 3 of Phase 1

  Task:    payment-handler (TASK-03-payment-handler-sonnet.md)
  Error:   test_failure
  Summary: PaymentService.charge() returns undefined — expected a
           PaymentResult object. The mock for StripeClient was not
           configured to return test data.

  Files touched:
    src/services/payment.ts
    src/services/payment.test.ts

  Last successful commit: abc1234 (task 2: user-model)

  Failure saved to state.json. Execution stopped.

  Next steps:
    1. Debug the failure:
       Claude Code:  /concert:debug
       GitHub UI:    Run concert-debug with sonnet
    2. Retry the task:
       Claude Code:  /concert:continue
    3. Check the test output manually:
       npm test -- --grep "PaymentService"
```

### 4.5 Non-Interactive Environment Redirect

When an interactive-only agent runs in GitHub Agents UI:

```
This command requires an interactive session.

  concert-init and concert-review need back-and-forth conversation
  with the user, which is not supported in GitHub Agents UI.

  Run this command in Claude Code instead:
    Claude Code web UI:  /concert:init
    Claude Code CLI:     /concert:init

  Non-interactive alternatives:
    Check status:       Run concert-status (works here)
    Continue execution: Run concert-continue (works here)
```

---

## 5. WIP PR Body Design

The WIP PR body serves as the single human-readable status display across all environments. It is updated after every stage transition and phase completion.

### 5.1 PR Body Template

```markdown
## Concert Mission: concert2-v1

### Pipeline
| Stage | Status |
|-------|--------|
| Vision | Accepted |
| Requirements | Accepted |
| Architecture | Accepted |
| UX | **Draft** |
| Tasks | Pending |

### Current Position
- **Stage:** UX (draft)
- **Feature size:** Large

### Execution Progress
_Not started — planning in progress._

### Recent Activity
| Date | Event |
|------|-------|
| 2026-03-26 | Architecture accepted |
| 2026-03-26 | Architecture reviewed |
| 2026-03-26 | Architecture drafted |
| 2026-03-26 | Requirements accepted |

### Next Steps
1. Review UX draft in Claude Code: `/concert:review`
2. Accept UX: `/concert:accept`
3. After accepting, advance to tasks: `/concert:continue`

---
_Updated by Concert at 2026-03-26T18:00:00Z_
```

### 5.2 PR Body During Execution

```markdown
## Concert Mission: my-feature

### Pipeline
| Stage | Status |
|-------|--------|
| Vision | Accepted |
| Requirements | Accepted |
| Architecture | Accepted |
| UX | Accepted |
| Tasks | Planned |

### Execution Progress
- **Phase:** 2 of 4 — "API Endpoints"
- **Tasks:** 8 / 22 (36%)
- **Current task:** auth-middleware (sonnet, reviewer iteration 2)

#### Phase Summary
| Phase | Name | Tasks | Status |
|-------|------|-------|--------|
| 1 | Foundation | 5/5 | Complete |
| 2 | API Endpoints | 3/6 | In progress |
| 3 | Frontend | 0/7 | Pending |
| 4 | Integration | 0/4 | Pending |

### Recent Activity
| Date | Event |
|------|-------|
| 2026-03-28 | Task 8: user-routes (sonnet, PASS) |
| 2026-03-28 | Task 7: db-queries (haiku, PASS) |
| 2026-03-28 | Phase 1 complete: Foundation |

### Cost Tracking
| Stage | Estimate |
|-------|----------|
| Planning | ~$2.50 |
| Phase 1 | ~$4.00 |
| Phase 2 | ~$3.00 (in progress) |
| Remaining | ~$8.00 |

### Next Steps
1. Continue execution: run `concert-continue` with sonnet
2. Push for handoff: `npx @he3-org/concert push`

---
_Updated by Concert at 2026-03-28T14:30:00Z_
```

### 5.3 PR Body Update Rules

- **When to update:** After stage acceptance, phase completion, task failure, and mission completion.
- **Not on every task:** Updating after every task would create excessive PR edit noise. Update on phase boundaries and failures.
- **Timestamp:** Every update includes the ISO 8601 timestamp.
- **Next steps:** Always reflect the current state. Never stale generic guidance.
- **Cost tracking:** Displayed when `telemetry.generate_cost_report` is true in `concert.jsonc`. Shows rough estimates, not exact token counts.

---

## 6. Terminal Output Conventions

### 6.1 Text Formatting

| Element | Format | Example |
|---------|--------|---------|
| Success header | Plain text | `Concert initialized in /home/user/project` |
| Error header | `Error:` prefix | `Error: not a git repository` |
| Warning header | `Warning:` prefix | `Warning: Concert files already exist` |
| Section label | Indented, colon-terminated | `  Created:` |
| List items | Indented with spaces | `    .claude/agents/  (14 files)` |
| Next steps | Numbered list under `Next steps:` | `  1. Review concert.jsonc` |
| File paths | Absolute or repo-relative | `docs/concert/state.json` |
| Commands | Inline, unquoted | `npx @he3-org/concert update` |

### 6.2 Iconography

Concert CLI output uses **no emoji and no Unicode symbols** beyond basic ASCII. The `[x]` and `[ ]` checkbox pattern for pipeline status is the only visual indicator.

**Rationale:** The primary user works from a Chromebook where terminal rendering varies. ASCII is universally safe. Agent conversation outputs in Claude Code and GitHub Agents UI render markdown natively, so formatting comes from markdown structure (headers, bold, tables, code blocks), not from special characters.

### 6.3 Color Usage

The CLI uses **no color by default**. The output is plain text that works identically in:
- Terminal with color support
- Terminal without color support
- Piped to a file
- Piped to another command
- Screen readers

**Rationale:** The CLI has 3 commands that produce short, structured output. Color adds complexity (NO_COLOR detection, TTY detection, chalk dependency) for near-zero value. The output is already structured with clear labels (Error:, Warning:, Next steps:) that convey meaning without color.

### 6.4 Progress Indicators

The CLI commands (`init`, `update`, `push`) are fast operations (file copying, git push). None should take more than a few seconds. No spinners, no progress bars.

Agent conversations in Claude Code / GitHub Agents UI have their own built-in progress indicators (streaming text). Concert agents do not add additional progress UI.

### 6.5 Stderr vs Stdout

| Stream | Content |
|--------|---------|
| stdout | All primary output — summaries, status, next steps |
| stderr | Error messages (Error:, Warning:) |

**Exit codes:**

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (operation failed) |
| 2 | Usage error (bad arguments, missing prerequisites) |

### 6.6 Width and Wrapping

CLI output is designed to fit within **80 columns**. No line exceeds 80 characters. This ensures readability in:
- Split-screen terminal windows
- Narrow browser-based terminals (Chromebook)
- Piped output

Agent conversation outputs (in Claude Code / GitHub) are not width-constrained — they use markdown formatting which the UI renders responsively.

---

## 7. Agent Output Structure

Every agent output (not just CLI commands) follows a consistent structure. This applies to all Concert agents: planner, analyst, architect, designer, runner, reviewer, debugger, status, and verifier.

### 7.1 Planning Agent Output (plan, analyst, architect, designer)

```
[Summary of what was produced]

  Files created/modified:
    [list of files with brief descriptions]

  Key decisions:
    [2-5 bullet points of the most important choices made]

  Next steps:
    1. [Most likely next action with command]
    2. [Alternative action with command]
    3. [Status check with command]
```

### 7.2 Execution Agent Output (runner, continue)

**After task completion:**

```
Task completed: [task-slug] ([model], [review-result], [iterations] iteration(s))

  Commit: [SHA] [commit message]
  Files changed: [count]
  Tests: [pass count] passing

  Progress: [completed]/[total] tasks ([percentage]%)
  Phase: [current]/[total] — [phase name]

  Next steps:
    1. [Continue execution or next action]
```

**After phase completion:**

```
Phase [N] complete: [phase name]

  Tasks completed: [count]
  Commits: [count]
  Documentation updated: [list of doc files]

  Phase [N+1]: [phase name] ([task count] tasks)

  Next steps:
    1. Continue to next phase:
       Claude Code:  /concert:continue
       GitHub UI:    Run concert-continue with [model]
    2. Push for handoff:
       npx @he3-org/concert push
```

### 7.3 Verification Agent Output

```
Verification complete: [pass-count]/[total-count] requirements passed

  Results:
    PASS:       [count] requirements fully satisfied
    PARTIAL:    [count] requirements partially met
    FAIL:       [count] requirements not met
    UNTESTABLE: [count] requirements cannot be verified

  Files created:
    [mission-path]/VERIFICATION.md
    [mission-path]/COST-REPORT.md

  [If any FAIL/PARTIAL:]
  Gap closure tasks generated:
    [mission-path]/phases/05-gap-closure/TASK-...

  Next steps:
    1. Review verification results:
       Read [mission-path]/VERIFICATION.md
    2. [If gaps:] Run gap closure tasks:
       /concert:continue
    3. [If all pass:] Mission complete!
```

---

## 8. Error Recovery Flows

### 8.1 Error Output Pattern

All errors — CLI and agent — follow the same three-part structure:

```
Error: [what went wrong]
  [why it happened — one sentence of context]

  Fix:
    [specific command or action to resolve]
```

For agent errors, the same pattern is used but in markdown:

```
**Error:** [what went wrong]

[Why it happened — one or two sentences of context.]

**Fix:**
1. [Specific action with command]
2. [Alternative if the first doesn't work]
```

### 8.2 Common Error Scenarios

**Missing prerequisite:**

```
Error: cannot run requirements — no accepted vision
  The requirements stage requires an accepted VISION.md.
  Current vision status: pending

  Fix:
    1. Create a vision:  /concert:init
    2. Check status:     /concert:status
```

**Interactive command in non-interactive environment:**

```
Error: concert-review requires an interactive session
  This command needs back-and-forth conversation with you.
  GitHub Agents UI does not support interactive sessions.

  Fix:
    Run this in Claude Code instead:
      /concert:review
```

**State schema violation:**

```
Error: state.json has an invalid field
  Field "pipeline.architecture" has value "banana" — expected one
  of: pending, draft, accepted

  Fix:
    1. Edit docs/concert/state.json and fix the value
    2. Or reset the stage:  /concert:restart architecture
```

**Git push failure:**

```
Error: could not push to origin
  Remote rejected the push. The remote branch may have diverged.

  Fix:
    1. Pull latest:  git pull --rebase origin concert/my-feature
    2. Retry push:   npx @he3-org/concert push
```

### 8.3 Debug Agent Flow

The debug agent follows a scientific method approach:

```
Agent: Reading failure block from state.json...

       FAILURE: test_failure at Phase 1, Task 3
       PaymentService.charge() returns undefined

       Analyzing:
         src/services/payment.ts
         src/services/payment.test.ts

       Hypothesis 1 (most likely): The StripeClient mock is not configured
       to return a PaymentResult. The test creates a mock but never sets up
       the return value for charge().

       Testing hypothesis 1...

       [reads test file, identifies the mock setup]

       Confirmed. The mock at line 15 of payment.test.ts creates a
       jest.fn() but does not provide a return value.

       Fix applied:
         payment.test.ts:15 — added mockReturnValue({ id: 'test', status: 'ok' })

       Running tests... all passing.

       Commit: fix(payment): configure mock return value for PaymentService tests

       Failure block cleared from state.json.

       Next steps:
         1. Continue execution:
            Claude Code:  /concert:continue
            GitHub UI:    Run concert-continue with sonnet
```

---

## 9. Accessibility

### 9.1 Screen Reader Compatibility

- All pipeline status uses text labels, not just visual indicators: `[x] Vision  accepted` includes the word "accepted" — the `[x]` is supplementary, not the only signal.
- Tables use markdown format with headers, which screen readers parse correctly.
- No color-only information. Every status is conveyed through text.
- Error severity is expressed in words (Error, Warning, CRIT, MAJ, MIN), not through color or icons.

### 9.2 Structural Text Output

- CLI output uses consistent indentation (2 spaces) for hierarchy.
- Section labels end with colons for clear structure.
- Numbered lists for ordered actions (next steps).
- Bulleted lists for unordered items (files created).

### 9.3 Agent Conversation Accessibility

Agent outputs use markdown formatting that renders consistently across:
- Claude Code web UI
- GitHub Agents UI
- CLI terminal (raw markdown is still readable as plain text)

No agent output relies on:
- Emoji for meaning
- Color for meaning
- Unicode special characters
- Images or diagrams (ASCII diagrams are acceptable in architecture docs)

---

## 10. Platform Conventions

### 10.1 CLI Conventions

| Convention | Implementation |
|-----------|----------------|
| `--help` / `-h` | Supported on all 3 commands |
| `--version` / `-V` | Prints package version |
| Exit codes | 0 (success), 1 (error), 2 (usage error) |
| No color | Default — no chalk, no ANSI codes |
| 80-column width | All output fits 80 columns |
| Stderr for errors | Error: and Warning: go to stderr |
| Idempotent where possible | `init` detects existing files; `push` reports "already up to date" |

### 10.2 Missing from CLI (by design)

The following CLI features are intentionally omitted for v1:

| Feature | Reason for omission |
|---------|-------------------|
| `--json` output | No consumer — agents read state.json directly |
| `--verbose` / `--quiet` | Output is already minimal; no detail levels needed |
| `--force` on init | Covered by `update` command for managed files |
| Shell completions | 3 commands with no flags — tab completion adds no value |
| Config file flags | concert.jsonc is always at project root — no override needed |
| Spinners / progress bars | Operations complete in seconds |

These may be added in future versions if demand arises.

### 10.3 Agent Command Conventions

| Convention | Implementation |
|-----------|----------------|
| Naming | `concert-<name>` prefix on all commands |
| CC invocation | `/concert:<name>` skill commands |
| GitHub invocation | Select `concert-<name>` agent in UI |
| Interactive detection | Check for Task tool availability (CC) vs absence (GitHub) |
| State reads | Always from `docs/concert/state.json` |
| State writes | Commit after every mutation |
| Output ending | Always ends with `Next steps:` section |

### 10.4 Markdown Formatting Conventions

Agent outputs use these markdown elements:

| Element | Use case |
|---------|----------|
| `**bold**` | Status labels, emphasis |
| `code` | File paths, commands, values |
| Tables | Pipeline status, phase summaries, comparisons |
| Numbered lists | Ordered steps (next steps, procedures) |
| Bulleted lists | Unordered items (files, features, concerns) |
| Code blocks | Command examples, multi-line output |
| Headers (`##`, `###`) | Major sections in generated documents |
| Horizontal rules (`---`) | Section separation in generated documents |

---

## 11. Cross-Environment Experience Consistency

### 11.1 Information Parity

The same information is available in all environments, just accessed differently:

| Information | Claude Code | GitHub Agents UI | CLI |
|-------------|-------------|-------------------|-----|
| Pipeline status | `/concert:status` | `concert-status` agent | WIP PR body |
| Execution progress | `/concert:status` | `concert-status` agent | WIP PR body |
| Failure details | `/concert:status` | `concert-status` agent | WIP PR body |
| Next steps | Every agent output | Every agent output | Every CLI output |
| Full state | `state.json` | `state.json` | `state.json` |

### 11.2 Handoff Guidance

When a user switches environments, the receiving agent provides orientation:

```
Resuming from cross-environment handoff.

  Last environment: Claude Code
  Last action: Task 6 completed (user-routes, sonnet)
  Quality loop state: reviewer, iteration 2 of auth-middleware

  Continuing from: reviewer iteration 2 of
  TASK-02-auth-middleware-sonnet.md (task 2/4)

  Prior findings from iteration 1:
    [MAJ] Missing input validation in auth.ts:42 — resolved
    [MIN] Missing JSDoc on authenticate() — unresolved
```

### 11.3 Model Selection Guidance

When execution involves tasks at different model tiers, the agent provides model selection guidance for GitHub Agents UI:

```
Phase 2 has tasks at multiple model tiers:

  sonnet tasks (4):
    TASK-02-auth-middleware-sonnet.md
    TASK-04-user-routes-sonnet.md
    TASK-05-data-validation-sonnet.md
    TASK-06-error-handling-sonnet.md

  opus tasks (1):
    TASK-07-security-audit-opus.md

  In GitHub Agents UI, run concert-continue twice:
    1. First with sonnet selected (handles 4 tasks)
    2. Then with opus selected (handles 1 task)

  In Claude Code, model routing is automatic.
```

---

## 12. Summary of Key UX Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CLI color | None | Simplicity; 3 short commands don't benefit from color |
| CLI emoji | None | ASCII universality across terminals |
| CLI progress indicators | None | Operations complete in seconds |
| Pipeline visualization | `[x]`/`[ ]` checkboxes | Universal, screen-reader friendly |
| Interview style | One question at a time | Reduce cognitive load; each answer shapes the next question |
| Review style | Two-phase (user first, then reviewer) | Respect user priorities |
| Review presentation | One concern at a time with counter | Prevent information overload |
| Status display | WIP PR body + concert-status agent | Single source of truth, accessible from any browser |
| Error format | Three-part: what / why / fix | Actionable recovery every time |
| Next steps | On every output, both CLI and UI options | Never leave user wondering what to do |
| Width constraint | 80 columns for CLI output | Narrow terminals, split screens |
| PR body updates | On stage/phase boundaries, not every task | Reduce PR edit noise |
| Agent output structure | Summary, details, next steps | Consistent, scannable pattern |
