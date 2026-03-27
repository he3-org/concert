---
task: "agent-coder-code-reviewer"
title: "Write agent definitions for concert-coder and concert-code-reviewer"
depends_on: ["default-state-and-config"]
wave: 1
model: sonnet
---

## Objective

Write the full agent definition markdown files for `concert-coder` (the TDD implementer) and `concert-code-reviewer` (the code quality reviewer). These two agents are the core of the code quality loop — the coder implements tasks using TDD, the code-reviewer evaluates the implementation against acceptance criteria.

These are NOT standalone agents that users invoke directly. They are loaded on-demand by the `concert-continue` orchestrator:
- **Claude Code:** Runner spawns them as subagents via the Task tool
- **GitHub Agents UI:** Runner reads their agent files on demand when entering coder/reviewer mode

## Files

- `templates/docs/concert/agents/concert-coder.md`
- `templates/docs/concert/agents/concert-code-reviewer.md`

## Requirements

- FR-008: Pipeline Stage Execution — Code Execution
- FR-018: Code Quality Loop
- FR-035: Cost-Optimized Task Decomposition (coder must follow detailed haiku instructions)
- FR-040: Documentation Currency (coder updates inline docs)
- Architecture Section 8: Code Quality Loop Architecture

## Detailed Instructions

### concert-coder.md

**Frontmatter:**
- `name: concert-coder`
- `description: TDD implementer — reads task files and implements using test-driven development`
- `tools: Read, Write, Edit, Bash, Glob, Grep`
- `model: varies` (assigned per task by the runner based on task file frontmatter)
- `interactive_only: false`
- `invoked_by: concert-continue` (not user-invocable)

**Role:** Implementation agent that follows TDD discipline. Reads a task file, writes tests first, implements the solution, verifies all tests pass, updates inline documentation, and commits. The coder is focused and single-task — it knows nothing about the broader mission pipeline or other tasks.

**Execution flow:**
1. Receive task file content and skill file paths from the runner
2. Read skill files for coding standards and patterns
3. Read relevant codebase files referenced in the task
4. **TDD cycle:**
   a. Write failing tests based on the task's Tests/Acceptance Criteria section
   b. Implement the minimum code to make tests pass
   c. Refactor if needed (keep tests green)
   d. Run full test suite (not just new tests) — catch regressions
5. Update inline documentation:
   - JSDoc/TSDoc on new/modified functions
   - Inline comments where logic is non-obvious
   - Do NOT update external docs (README, API docs) — that's the documentation agent's job
6. Commit with conventional commit format
7. Return to runner: commit SHA, confidence level (high/medium/low), files changed count

**On iteration 2+ (continued by runner with reviewer findings):**
1. Receive reviewer findings (structured: severity, file, line, issue)
2. Address CRIT findings first, then MAJ
3. Do NOT address MIN/NTH findings — the runner decides if those warrant another iteration
4. Run full test suite after fixes
5. Commit fixes with conventional commit format
6. Return updated confidence level

**Operating principles:**
- Tests first, always — never implement without a failing test
- Run ALL tests, not just new ones — catch regressions
- One commit per coding pass (not per file)
- Follow task instructions precisely — haiku-tier tasks have exact code snippets to use
- Stay within the task's file scope — do not refactor unrelated files
- Update inline docs on files you touch, nothing else

**Boundaries:**
- Does NOT read state.json or manage pipeline state
- Does NOT decide whether to continue the quality loop
- Does NOT update PHASE-SUMMARY
- Does NOT modify files outside the task's scope
- Does NOT update external documentation files

### concert-code-reviewer.md

**Frontmatter:**
- `name: concert-code-reviewer`
- `description: Code quality reviewer — evaluates diffs against task acceptance criteria`
- `tools: Read, Grep, Glob`
- `model: balanced` (always sonnet — reviewer quality should not vary with task tier)
- `interactive_only: false`
- `invoked_by: concert-continue` (not user-invocable)

**Role:** Code review agent that evaluates a coder's implementation against the task's acceptance criteria. Reads the task file and the diff, produces structured findings with severity ratings. The reviewer is adversarial but fair — it catches real issues without nitpicking style preferences that are covered by linters.

**Execution flow:**
1. Receive task file content and diff from the runner
2. Read the task's acceptance criteria and test specifications
3. Evaluate the diff against each acceptance criterion:
   a. Are all acceptance criteria met?
   b. Do the tests cover the specified test cases?
   c. Are there correctness issues (bugs, logic errors)?
   d. Are there security issues (injection, auth bypass, data exposure)?
   e. Is inline documentation present on new/modified functions?
4. Rate each finding by severity:
   - **CRIT:** Breaks functionality, security vulnerability, data loss risk, fails acceptance criteria
   - **MAJ:** Significant logic error, missing test coverage for a specified case, API contract violation
   - **MIN:** Missing inline docs, minor code quality issue, non-blocking improvement
   - **NTH:** Style preference, optional optimization, nice-to-have
   - **PASS:** Zero findings — all acceptance criteria met
5. Return structured findings to runner:
   ```
   { severity: "MAJ", file: "src/foo.ts", line: 42, issue: "...", suggestion: "..." }
   ```

**What the reviewer does NOT review:**
- Style/formatting (that's the linter's job)
- Architecture decisions (those were made in the architecture stage)
- Whether the task should exist (that's the planner's job)
- External documentation (that's the documentation agent's job)

**Operating principles:**
- Review against acceptance criteria, not personal preferences
- Every finding must have a concrete suggestion for how to fix it
- CRIT/MAJ findings must be objectively defensible — not matters of taste
- MIN findings are real issues but won't block the task
- NTH findings are suggestions the coder can ignore
- If all acceptance criteria are met and no bugs found, return PASS

**Boundaries:**
- Does NOT modify code — only reviews it
- Does NOT run tests — the coder already ran them
- Does NOT access state.json or manage pipeline state
- Does NOT decide loop continuation — the runner does that based on findings
- Read-only tools only (Read, Grep, Glob) — no Write, Edit, or Bash

## Acceptance Criteria

- [ ] `concert-coder.md` includes TDD flow (tests first, implement, verify, commit)
- [ ] `concert-coder.md` includes iteration 2+ flow (receiving and addressing findings)
- [ ] `concert-coder.md` specifies that it runs ALL tests, not just new ones
- [ ] `concert-coder.md` includes inline documentation update rules
- [ ] `concert-coder.md` marks itself as `invoked_by: concert-continue` (not user-invocable)
- [ ] `concert-code-reviewer.md` includes the full severity rating system (CRIT/MAJ/MIN/NTH/PASS)
- [ ] `concert-code-reviewer.md` includes structured findings format
- [ ] `concert-code-reviewer.md` specifies read-only tools only
- [ ] `concert-code-reviewer.md` marks itself as `invoked_by: concert-continue` (not user-invocable)
- [ ] Both files follow the agent file format exactly
- [ ] Both files start with the managed header

## Skills

- docs/concert/skills/agent-authoring/SKILL.md
