# /concert:continue

Resume from where the last session stopped.

## Steps

1. Read `docs/concert/state.json` — this is your ONLY source of truth
2. Read the active workflow file (from `workflow_path`)
3. Assess the current state and determine the next action:
   - If no mission exists → output "No active mission. Start one with `/concert:init`"
   - If in planning stages → check stage status, suggest review/accept/plan
   - If mid-task → resume that task from the last commit
   - If between tasks → start the next task
   - If between task files → start the next task file
   - If between phases → check if planning needed, then execute
   - If all phases done → run verification
   - If there's a `failure` block → assess if continuable or needs debugging
   - If there are `blockers[]` → report them and suggest resolution
4. Execute the determined action following workflow rules
5. Spawn the appropriate agent (see `docs/concert/agents/concert-continue.md`)
6. Update `state.json` continuously
7. On completion or session end, update state with clear next steps

## Next Steps

Output is context-dependent — the continue agent determines what's next based on state.
