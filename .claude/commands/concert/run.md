# /concert:run [phase]

Execute all task files in a phase.

## Steps

1. Read `docs/concert/state.json` → get mission_path, workflow_path, execution position
2. Read the active workflow's execution rules (`CONCERT-WORKFLOW-EXECUTION.md`)
3. If `[phase]` is provided, execute that phase; otherwise execute the next unfinished phase
4. Read all `TASK-*.md` files in the phase directory
5. Resolve dependency DAG → group into waves
6. For each wave:
   a. Read each task file's `model` frontmatter field
   b. Spawn runner agents per task (see `docs/concert/agents/concert-runner.md`)
   c. Each runner: read task → implement → test → commit → log telemetry → update PHASE-SUMMARY
   d. After wave completes: cross-wave dependency check
7. After all waves: run regression gate (full test suite)
8. Update `state.json` with completion status
9. Update human status display

## Next Steps

After run completes, output:
```
📋 Next steps:
  → Review phase summary:  docs/concert/missions/.../PHASE-SUMMARY-NN.md
  → Run next phase:        /concert:run
  → Verify all work:       /concert:verify
  → Check status:          /concert:status
```
