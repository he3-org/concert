# /concert:debug <issue>

Scientific-method debugging with persistent state.

## Steps

1. Read `docs/concert/state.json` for current mission context
2. Read `docs/concert/concert.jsonc` for project configuration
3. Parse the user's bug description
4. Spawn the `concert-debugger` agent (see `docs/concert/agents/concert-debugger.md`):
   - Form hypotheses about the root cause
   - Design and execute tests to narrow the cause
   - Isolate the root cause
   - Implement the fix
   - Verify the fix with tests
5. Persist debug state in `state.json` (in case of session crash mid-debug)
6. Commit fix with conventional format (`fix(scope): description`)
7. Update `state.json` — clear debug state, log in history

## Next Steps

After debug completes, output:
```
📋 Next steps:
  → Review the fix:    git diff HEAD~1
  → Run full tests:    [project test command]
  → Continue work:     /concert:continue
  → Check status:      /concert:status
```
