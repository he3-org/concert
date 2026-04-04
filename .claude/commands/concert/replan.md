# /concert:replan [stage]

Go back to a specific pipeline stage during execution.

## Steps

1. Read `docs/concert/state.json` → get current stage, mission_path, workflow_path
2. Parse the target stage from `[stage]` argument (required)
3. Validate the target stage is earlier than the current stage
4. Interview the user about what needs to change and why
5. Mark all stages after the target as "needs re-run" in `state.json`
6. Re-run the specified consultant agent for that stage
7. After the consultant completes, the user reviews and accepts
8. Re-run all downstream consultants in sequence
9. The planner regenerates TASK files, accounting for already-completed work
10. Update `state.json` and human status display

## Important

- Committed code stays — it is NOT rolled back
- Replanned TASK files reference existing code and only describe new/changed work
- This is like a database migration rollback — back to a decision point, not back in time

## Next Steps

After replan, output:

```
📋 Next steps:
  → Review the updated plan:  /concert:review    (@concert-review in Copilot)
  → Accept and continue:      /concert:accept    (@concert-accept in Copilot)
  → Check status:             /concert:status    (@concert-status in Copilot)
```
