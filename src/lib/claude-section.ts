import { CLAUDE_SECTION_START, CLAUDE_SECTION_END } from '../types.js';

/**
 * Build the canonical Concert section that is written into the user's
 * `CLAUDE.md` on `init` and refreshed on `update`. Kept here as the single
 * source of truth so the section content stays consistent across commands.
 */
export function buildConcertSection(): string {
  return `${CLAUDE_SECTION_START}

## Concert

This project uses [Concert](https://github.com/he3-org/concert) for agentic development orchestration.

### Commands

Vision → Requirements → Architecture → UX → Plan → Develop → Review → Finish → Refactor.
Run review-docs after every spec document and alignment after every change.

- \`/concert-vision\` — create or refine \`VISION.md\` for a mission
- \`/concert-requirements\` — derive \`REQUIREMENTS.md\` from the vision
- \`/concert-architect\` — produce \`ARCHITECTURE.md\` from the requirements
- \`/concert-ux-design\` — produce \`UX-DESIGN.md\` (skip for non-UI features)
- \`/concert-review-docs\` — interactive review (\`review\`, \`review-and-reconcile\`, \`re-evaluate-all\`); auto-runs alignment after edits
- \`/concert-alignment\` — cross-check spec docs for contradictions and gaps
- \`/concert-planner\` — break the architecture into phased \`TASK-*.md\` files
- \`/concert-develop\` — TDD implementation, \`fix-gaps\`, and \`refactor\` execution
- \`/concert-develop-review\` — produce \`DEVELOPMENT-REVIEW.md\` against the specs
- \`/concert-develop-finish\` — archive working docs and emit reference documentation
- \`/concert-status\` — read-only snapshot: stage, modified docs, gaps, refactor items, next action
- \`/concert-refactor\` — ranked, behavior-preserving refactor plan (utility, runnable any time)
- \`/concert-token-optimizer\` — audit agents and instruction files for token waste

### Skills

Browse and install optional Copilot skills (kept in [\`he3-org/concert-assets\`](https://github.com/he3-org/concert-assets)) into \`.github/skills/\`:

- \`npx @he3-org/concert skills list\` — list available skills
- \`npx @he3-org/concert skills search <term>\` — find a skill by name or description
- \`npx @he3-org/concert skills add <name>...\` — install one or more skills

Installed skill files live under \`.github/skills/<name>/\` and are tracked by your repo (not managed by \`concert update\`).

### Rules

Browse and install optional Claude Code rules from the same assets repo into \`.claude/rules/\`:

- \`npx @he3-org/concert rules list\` — list available rules
- \`npx @he3-org/concert rules search <term>\` — find a rule by name or description
- \`npx @he3-org/concert rules add <name>...\` — install one or more rules

Installed rule files live under \`.claude/rules/<name>.md\` and are tracked by your repo (not managed by \`concert update\`).

### State

- Configuration: \`concert.jsonc\`
- State: \`.concert/state.json\`

### Do Not Modify

The following paths are managed by Concert and must not be modified by other agents, refactoring tools, or automated processes. They will be overwritten on \`concert update\`:

- \`.github/agents/concert-*.agent.md\`
- \`.claude/commands/concert-*.md\`
- \`.claude/rules/concert-*.md\`
- \`concert.jsonc\` (modify manually only — Concert preserves your changes on update)

${CLAUDE_SECTION_END}`;
}
