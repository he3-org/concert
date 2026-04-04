# /concert:status (alias: /concert:whats-next)

Show current mission position, pipeline progress, cost estimate, and next steps.

## Steps

1. Read `.concert/state.json` for current mission and pipeline position
2. Read the active workflow file to understand the full pipeline stages
3. Determine which stage the mission is at:
   - Vision created but not accepted? → suggest review/accept
   - Planning stages in progress? → suggest plan/review/accept
   - All planning done, mid-execution? → suggest run/continue
   - All phases done? → suggest verify
   - Verified? → suggest shipping
4. Read `.concert/concert.jsonc` for project configuration
5. Output formatted status with:
   - Mission name and PR link
   - Pipeline progress bar
   - Current phase progress (if in execution)
   - Cost estimate (spent + remaining)
   - Next steps with both CLI and GitHub UI options

## Output Format

```
📊 Mission: YYYY-MM-DD-slug  (PR #N)

Pipeline: vision ✅ → requirements ✅ → architecture ⏳ → ...

Phase N (name):  ████░░░░ XX% (task-file, task M/N)
Cost: ~$X.XX spent  |  ~$X-Y remaining

📋 Next steps:
  → [context-appropriate action]: /concert:[command]  (@concert-[command] in Copilot)
  → Track progress: [PR link]
```
