# /concert:review [stage]

Interactive review of the current stage's plan document.

## Steps

1. Read `docs/concert/state.json` → get current stage, mission_path
2. If `[stage]` is provided, review that stage; otherwise review the current stage
3. Determine the plan file to review based on stage:
   - `vision` → `VISION.md`
   - `requirements` → `REQUIREMENTS.md`
   - `architecture` → `ARCHITECTURE.md`
   - `ux` → `UX.md`
   - `tasks` → phase/TASK files
4. Spawn the `concert-reviewer` agent (see `.claude/agents/concert-reviewer.md`)
5. The reviewer presents the document and asks: "Accept, add changes, or ask questions?"
6. Open conversation loop — user provides feedback, reviewer incorporates it
7. When user is satisfied, update the plan file with all changes
8. Update `state.json` if review leads to acceptance

## Next Steps

After review, output:

```
📋 Next steps:
  → Accept this stage:    /concert:accept        (@concert-accept in Copilot)
  → Continue reviewing:   /concert:review        (@concert-review in Copilot)
  → Restart this stage:   /concert:restart       (@concert-restart in Copilot)
  → Check status:         /concert:status        (@concert-status in Copilot)
```
