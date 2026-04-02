## Verification Patterns for Coding Agents

Every agent must verify its own output before reporting success. The type of verification depends on what the agent produces.

### For Agents That Write Code

1. **Run the test suite** — not just new tests, the full suite. Regressions are the most common failure mode.
2. **Run type checking** — if the project uses TypeScript, Go, or another typed language, run the type checker (`tsc --noEmit`, `go vet`, etc.).
3. **Diff review** — before committing, review the diff. Check for: debug statements, commented-out code, unrelated changes, files that shouldn't have been modified.
4. **Acceptance criteria check** — re-read the task's acceptance criteria and verify each one is met. If a criterion is ambiguous, flag it rather than assuming it's met.

### For Agents That Generate Plans or Specs

1. **Completeness check** — verify every requirement from the input is addressed in the output.
2. **Internal consistency** — verify the plan doesn't contradict itself (e.g., "use library X" in one section, "avoid external dependencies" in another).
3. **Path validation** — verify every file path mentioned in the plan exists in the repository (or is explicitly marked as "to be created").

### For Agents That Review Code

1. **Reproduce the finding** — before reporting a bug, verify it exists by reading the actual code. Don't report findings based on assumptions about what the code does.
2. **Severity calibration** — CRIT findings must be provably wrong (crash, data loss, security hole). MAJ findings are quality issues. Don't inflate severity.
3. **Fix feasibility** — every finding should include enough context that the coder agent can fix it without re-investigating.

### The "Never Trust First Pass" Rule

After completing the primary task, the agent must re-read its own output with a critical eye:

- Did I actually do what was asked, or did I do what I assumed was asked?
- Are there edge cases I didn't handle that the task mentioned?
- Did I introduce changes outside the scope of the task?

This self-review step catches the most common agent failure: confidently completing the wrong thing.

### Confidence Reporting

Every agent should report a confidence level with reasoning:

- **High** — all acceptance criteria met, tests pass, no ambiguity in requirements
- **Medium** — requirements had ambiguity, or some edge cases weren't fully testable
- **Low** — partial implementation, blocked by external dependency, or requirements unclear

Never report high confidence without running verification. Evidence before assertion.
