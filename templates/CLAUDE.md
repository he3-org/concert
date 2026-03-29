<!-- CONCERT:START — DO NOT MODIFY THIS SECTION. It is managed by Concert and will be overwritten on `concert update`. -->

## Concert

This project uses [Concert](https://github.com/he3-org/concert) for agentic development orchestration.

### Commands

- `/concert:init` — Start a new mission
- `/concert:review` — Review a stage
- `/concert:accept` — Accept a stage
- `/concert:status` — Check current status
- `/concert:continue` — Continue to next stage or resume execution
- `/concert:debug` — Debug an issue
- `/concert:verify` — Verify work
- `/concert:quick` — Run a quick task
- `/concert:restart` — Restart a stage
- `/concert:replan` — Replan from a stage
- `/concert:archive` — Archive completed mission and reset state

### State

- Configuration: `concert.jsonc`
- State: `docs/concert/state.json`
- Agents: `.claude/agents/`
- Workflows: `docs/concert/workflows/`
- Skills: `.claude/skills/`
- Missions: `docs/concert/missions/`

### Do Not Modify

The following paths are managed by Concert and must not be modified by other agents, refactoring tools, or automated processes. They will be overwritten on `concert update`:

- `.claude/agents/`
- `docs/concert/workflows/`
- `.claude/skills/`
- `.claude/commands/concert/`
- `.github/agents/concert-*.agent.md`
- `concert.jsonc` (modify manually only — Concert preserves your changes on update)

<!-- CONCERT:END — DO NOT MODIFY THIS SECTION -->
