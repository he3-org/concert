# /concert:init [prompt] [files...]

Create a new Concert mission.

## Steps

1. Check if `.concert/state.json` exists and has an active mission — if so, warn the user
2. Check if project-level specs exist (`.concert/*-SPEC.md`) to detect new project vs. new feature
3. Read `.concert/concert.jsonc` for project configuration
4. Spawn the `concert-interviewer` agent (see `.claude/agents/concert-interviewer.md`):
   - Interview the user about their vision
   - Classify feature size (small/medium/large)
   - Propose a workflow (user can override)
5. Create the mission folder: `.concert/missions/YYYY-MM-DD-slug/`
6. Write `VISION.md` in the mission folder
7. Initialize `.concert/state.json` with:
   - Mission name and path
   - Selected workflow and workflow_path
   - Feature size
   - Stage: "vision"
   - Pipeline: `{ "vision": "draft" }`
   - Empty telemetry[], failure_log[], history[], blockers[]
8. Create human status display (WIP PR)

## Next Steps

After init completes, output:

```
📋 Next steps:
  → Review vision:    /concert:review        (@concert-review in Copilot)
  → Accept vision:    /concert:accept        (@concert-accept in Copilot)
  → Check status:     /concert:status        (@concert-status in Copilot)
```
