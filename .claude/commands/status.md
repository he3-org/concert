# /concert:status (alias: /concert:whats-next)

Show current mission position, pipeline progress, cost estimate, and next steps.

## Steps

1. Read `docs/concert/state.json` for current mission and pipeline position
2. Read the active workflow file to understand the full pipeline stages
3. Determine which stage the mission is at:
   - Vision created but not accepted? → suggest review/accept
   - Planning stages in progress? → suggest plan/review/accept
   - All planning done, mid-execution? → suggest run/continue
   - All phases done? → suggest verify
   - Verified? → suggest shipping
4. Read `docs/concert/concert.jsonc` for `status_display` mode
5. Output formatted status with:
   - Mission name and PR link (if wip_pr mode)
   - Pipeline progress bar
   - Current phase progress (if in execution)
   - Cost estimate (spent + remaining)
   - Next steps with both CLI and GitHub UI options

## Output Format

```
📊 Mission: YYYY-MM-DD-slug  (PR #N or STATUS.md)

Pipeline: vision ✅ → requirements ✅ → architecture ⏳ → ...

Phase N (name):  ████░░░░ XX% (task-file, task M/N)
Cost: ~$X.XX spent  |  ~$X-Y remaining

📋 Next steps:
  → [context-appropriate action]: /concert:[command]
  → In GitHub UI: Select "[agent-name]" agent
  → Track progress: [PR link or STATUS.md path]
```
