# /concert:plan [stage]

Trigger the next pipeline consultant or a specific one.

## Steps

1. Read `docs/concert/state.json` → get current stage, workflow_path, mission_path
2. Read the active workflow file to determine which consultant runs next
3. If `[stage]` is provided, use that stage instead of auto-detecting
4. Determine the consultant agent based on stage:
   - `requirements` → spawn `concert-analyst` (see `docs/concert/agents/concert-analyst.md`)
   - `architecture` → spawn `concert-architect` (see `docs/concert/agents/concert-architect.md`)
   - `ux` → spawn `concert-designer` (see `docs/concert/agents/concert-designer.md`)
   - `tasks` → spawn `concert-planner` (see `docs/concert/agents/concert-planner.md`)
5. The consultant reads mission docs, project specs, and codebase
6. The consultant writes/updates the appropriate plan document in the mission folder
7. Update `state.json` with the new stage status (e.g., `"requirements": "draft"`)
8. Update human status display

## Next Steps

After plan completes, output:
```
📋 Next steps:
  → Review the plan:   /concert:review
  → Accept the plan:   /concert:accept
  → Restart from scratch: /concert:restart
  → Check status:      /concert:status
```
