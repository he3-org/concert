# /concert:quick <task>

Quick task execution without the full pipeline.

## Steps

1. Read `docs/concert/state.json` to check for active missions (warn if one exists)
2. Read `docs/concert/concert.jsonc` for project configuration and skills
3. Parse the user's task description
4. Spawn the `concert-quick` agent (see `.claude/agents/concert-quick.md`):
   - Load applicable skills based on file patterns
   - Implement the task directly (no planning phase)
   - Run tests
   - Commit with conventional format
5. Update `state.json` minimally (log the quick task)

## Next Steps

After quick completes, output:

```
📋 Next steps:
  → Review changes:  git diff HEAD~1
  → Run tests:       [project test command]
  → Continue work:   /concert:status
```
