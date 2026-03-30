---
task: "agent-decoupling"
title: "Decouple agents from hardcoded stage routing and document mappings"
depends_on: ["stage-registry"]
wave: 2
model: sonnet
---

## Context

Read these files for full context:
- `docs/concert/missions/2026-03-29-centralize-workflow-stages/ARCHITECTURE.md` — D4 agent decoupling strategy
- `docs/concert/stage-registry.jsonc` — the registry (created in wave 1)
- `docs/concert/templates/user-guidance.md` — templates (created in wave 1)

## Task 1: Update concert-continue to use registry lookup

**Files to modify:**
- `.claude/agents/concert-continue.md`

**Requirements:**
1. Replace the hardcoded if/then stage→agent routing block (lines 57-61 of execution_flow) with registry lookup logic:
   ```
   Read docs/concert/stage-registry.jsonc → find entry where name matches state.json stage → read entry.agent → follow that agent's instructions
   ```
2. Add `docs/concert/stage-registry.jsonc` to the boot sequence (workflow_integration section)
3. Keep all other sections unchanged

**Acceptance criteria:**
- [ ] No hardcoded stage→agent mappings remain in the file
- [ ] Boot sequence includes reading stage-registry.jsonc
- [ ] Execution flow describes registry lookup, not if/then branching
- [ ] Agent still handles all existing states: no mission, pending stage, draft stage, execution, verification, complete

## Task 2: Update concert-reviewer to use registry lookup

**Files to modify:**
- `.claude/agents/concert-reviewer.md`

**Requirements:**
1. Replace the hardcoded pipeline→document mapping (lines 55-59 of workflow_integration) with registry lookup:
   ```
   Read docs/concert/stage-registry.jsonc → find entry where name matches the stage with "draft" status → use entry.output_template to construct the document path
   ```
2. Add `docs/concert/stage-registry.jsonc` to the boot sequence

**Acceptance criteria:**
- [ ] No hardcoded `pipeline.<stage> == "draft"` → document mappings remain
- [ ] Boot sequence includes reading stage-registry.jsonc
- [ ] Reviewer can determine the correct document for ANY stage, not just the 4 currently hardcoded

## Task 3: Update concert-status to use registry

**Files to modify:**
- `.claude/agents/concert-status.md`

**Requirements:**
1. Add `docs/concert/stage-registry.jsonc` to the boot sequence
2. Update execution_flow to read stage list from registry (via the workflow's stage list) instead of parsing the workflow markdown file's stage table

**Acceptance criteria:**
- [ ] Boot sequence includes reading stage-registry.jsonc
- [ ] Pipeline rendering uses registry stage data
- [ ] No dependency on parsing markdown stage tables

## Task 4: Update planning agents to use guidance templates

**Files to modify:**
- `.claude/agents/concert-analyst.md`
- `.claude/agents/concert-architect.md`
- `.claude/agents/concert-designer.md`
- `.claude/agents/concert-planner.md`

**Requirements:**
1. Add `docs/concert/stage-registry.jsonc` and `docs/concert/templates/user-guidance.md` to each agent's boot sequence
2. Replace the bespoke `<user_guidance>` example blocks with a reference to the template:
   ```
   Read docs/concert/templates/user-guidance.md → use the "Stage Draft Complete" template → substitute variables from registry and state.json
   ```
3. Keep the `<user_guidance>` section but make it reference the template rather than embedding example blocks
4. Remove any hardcoded "next stage" references (e.g., analyst saying "advance to architecture")

**Acceptance criteria:**
- [ ] All 4 agents reference the registry and templates in boot sequence
- [ ] No agent embeds hardcoded next-stage knowledge
- [ ] User guidance sections reference templates, not bespoke examples
- [ ] Agents remain readable as standalone documents (not just "read the template")
