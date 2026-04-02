# /concert:accept [stage]

Accept the current stage's plan, create project-level spec, advance pipeline.

## Steps

1. Read `docs/concert/state.json` → get current stage, mission_path, workflow_path
2. Read the active workflow file to determine the next stage after acceptance
3. If `[stage]` is provided, accept that stage; otherwise accept the current stage
4. Mark the current stage as "accepted" in `state.json` → `pipeline`
5. Create or update the project-level spec file:
   - `vision` accepted → write `docs/concert/VISION-SPEC.md`
   - `requirements` accepted → write `docs/concert/REQUIREMENTS-SPEC.md`
   - `architecture` accepted → write `docs/concert/ARCHITECTURE-SPEC.md`
   - `ux` accepted → write `docs/concert/UX-SPEC.md`
   - `tasks` accepted → no spec, just mark as accepted
6. Advance to the next pipeline stage per the workflow definition
7. Update `state.json` with new stage
8. Update human status display
9. Commit the spec file and state changes

## Next Steps

After accept, output the workflow-appropriate next step:

```
📋 Next steps:
  → Continue:           /concert:continue     (advance to next stage or start execution)
  → Check status:       /concert:status
```
