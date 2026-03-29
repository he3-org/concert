## Tool Selection and Error Recovery

### Tool Selection

Only request tools the agent actually uses. Common tool sets by agent type:

- **Read-only agents** (analysts, reviewers): `Read, Glob, Grep, Bash`
- **Implementation agents** (coders, fixers): `Read, Write, Edit, Bash, Grep, Glob`
- **Orchestration agents** (planners, dispatchers): `Read, Write, Edit, Bash, Grep, Glob` (need Write/Edit for state management)

Avoid granting `Write` or `Edit` to agents that should only analyze. This prevents accidental modifications.

### Error Handling in Execution Flow

Every agent's `<execution_flow>` must include explicit failure handling. Use this pattern:

```
On failure:
1. Stop immediately — do not attempt to continue past the failure
2. Record failure details to state.json → failure_log[]
3. Report: what failed, what was attempted, what state was left in
4. Output actionable next steps for recovery
```

### Retry Strategy

Agents should retry only when:
- The failure is transient (network timeout, flaky test, rate limit)
- The retry has a different approach (not identical re-execution)
- A maximum retry count is defined (typically 2-3 attempts)

Agents should NOT retry when:
- The failure is deterministic (type error, missing file, invalid config)
- The error message indicates a logic problem, not an environment problem

### Escalation

When an agent cannot resolve a failure after retries:
1. Write current state to `state.json` so the next session has full context
2. Commit any partial work that is valid (don't lose progress)
3. Output a clear message: what failed, what was tried, what the user should do
4. Suggest the appropriate recovery command (e.g., `/concert:debug` for investigation)

### Script Delegation

For deterministic operations (data transforms, file validation, complex parsing), delegate to scripts rather than LLM reasoning:
- Place scripts in the skill's `scripts/` directory or the project's standard script location
- Scripts must return human-readable error messages on stderr — not just exit codes
- Bad: `exit 1`
- Good: `echo "ERROR: Input file not found at '${INPUT_PATH}'. Verify the path exists." >&2; exit 1`
- Document required runtime dependencies (Node version, Python packages) in the agent definition or skill reference
