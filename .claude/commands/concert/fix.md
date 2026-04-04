# /concert:fix <error_description>

Fix an error using TDD-first diagnosis, root cause analysis, and quality-focused repair.

Does not create a mission. If the fix requires extraordinary changes (architecture-level
redesign), a reasoning document is written to `docs/` and the command exits with guidance.

## Steps

1. Read `docs/concert/state.json` for any active mission context (optional — fix works without a mission)
2. Read `concert.jsonc` for project configuration and skills
3. Parse the user's error description — extract:
   - Error message or symptom
   - Steps to reproduce (if provided)
   - Files or components involved (if known)
4. Spawn the `concert-fix` agent (see `.claude/agents/concert-fix.md`):
   - Reproduce the error
   - Diagnose root cause using scientific method
   - Write a failing test that captures the error
   - Implement the fix (make the test pass)
   - Assess whether refactoring would prevent the error class
   - If refactoring is warranted, apply it
   - Review the fix against the `CONCERT-WORKFLOW-FIX.md` quality loop
   - If skills or documentation need updating to prevent recurrence, update them; if an agent change is needed, note the required change and do not edit `.claude/agents/` unless explicitly authorized
5. If the fix is impossible or requires architecture-level changes:
   - Write a reasoning document to `docs/concert/fix-escalation-<date>.md`
   - Output: "This needs extraordinary guidance. See: `<document_path>`"
   - Do NOT attempt the fix
   - Do NOT create or modify `docs/concert/state.json`
6. Commit fix with conventional format: `fix(scope): description`
7. If `docs/concert/state.json` exists, update it — append an entry to `history[]`; append to `failure_log[]` only if the fix was for a tracked failure

## Next Steps

After fix completes, output:

```
📋 Next steps:
  → Review the fix:       git diff HEAD~1
  → Run full tests:       [project test command]
  → Continue work:        /concert:continue      (@concert-continue in Copilot)
  → Check status:         /concert:status        (@concert-status in Copilot)
```
