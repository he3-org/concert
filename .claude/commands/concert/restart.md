# /concert:restart [stage]

Discard the current stage's plan and re-run the consultant from scratch.

## Steps

1. Read `docs/concert/state.json` → get current stage, mission_path
2. If `[stage]` is provided, restart that stage; otherwise restart the current stage
3. Delete or archive the current plan file for that stage
4. Reset the stage status in `state.json` → `pipeline` back to pre-draft
5. Re-trigger the appropriate consultant agent for that stage
6. Update human status display

## Next Steps

After restart, output:

```
📋 Next steps:
  → Review the new plan:  /concert:review        (@concert-review in Copilot)
  → Accept the plan:      /concert:accept        (@concert-accept in Copilot)
  → Check status:         /concert:status        (@concert-status in Copilot)
```
