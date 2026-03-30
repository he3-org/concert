---
task: "workflow-simplification"
title: "Simplify workflow files and add registry validation tests"
depends_on: ["agent-decoupling"]
wave: 3
model: sonnet
---

## Context

Read these files for full context:
- `docs/concert/missions/2026-03-29-centralize-workflow-stages/ARCHITECTURE.md` — D3 workflow simplification
- `docs/concert/stage-registry.jsonc` — the registry (created in wave 1)
- `docs/concert/workflows/CONCERT-WORKFLOW-MISSION-FULL.md` — current full workflow
- `docs/concert/workflows/CONCERT-WORKFLOW-MISSION-MEDIUM.md` — current medium workflow
- `docs/concert/workflows/CONCERT-WORKFLOW-MISSION-SMALL.md` — current small workflow

## Task 1: Simplify workflow files

**Files to modify:**
- `docs/concert/workflows/CONCERT-WORKFLOW-MISSION-FULL.md`
- `docs/concert/workflows/CONCERT-WORKFLOW-MISSION-MEDIUM.md`
- `docs/concert/workflows/CONCERT-WORKFLOW-MISSION-SMALL.md`

**Requirements:**
1. Replace the `## Stages` table with a simple stage list declaration and registry reference:
   ```markdown
   ## Stages

   Stages: vision, requirements, architecture, ux, tasks, execution, verification, retrospective

   → See `docs/concert/stage-registry.jsonc` for stage details (agent, inputs, outputs, transitions).
   ```
2. Remove the `## Stage Details` section with per-stage subsections (### Stage 1: Vision, etc.) — this information now lives in the registry
3. Keep ALL other sections intact: Overview, Review Points, On Stage Complete, On Failure, Stage Override, Rollback, Skipped Stage (where applicable)
4. Keep the YAML frontmatter (name, description, triggers) unchanged
5. Keep the managed file header

**Acceptance criteria:**
- [ ] Each workflow file has a `Stages:` declaration line listing its stages by name
- [ ] Each workflow file references `docs/concert/stage-registry.jsonc`
- [ ] No duplicated stage detail sections remain
- [ ] All prose sections (Overview, Review Points, On Failure, etc.) are preserved
- [ ] YAML frontmatter unchanged
- [ ] Stage lists match the `workflows` object in stage-registry.jsonc:
  - full: vision, requirements, architecture, ux, tasks, execution, verification, retrospective
  - medium: vision, requirements, architecture, tasks, execution, verification, retrospective
  - small: vision, tasks, execution, verification, retrospective (note: includes retrospective)

## Task 2: Add registry validation tests

**Files to modify:**
- `src/__tests__/templates.test.ts`

**Requirements:**
1. Add a new test section "Stage registry" after the existing "Rule files" section
2. Tests to add:
   - Registry file exists and is valid JSONC
   - All stages have required fields (name, order, agent, inputs, outputs, output_template, triggers_review, produces_spec, interactive, display_name)
   - All referenced agent files exist in `.claude/agents/`
   - Stage names are unique
   - Stage orders are sequential (1, 2, 3...)
3. Add a test section "Workflow-registry consistency":
   - Each workflow variant in the registry only references stage names that exist in the `stages` array
   - Each workflow markdown file's `Stages:` line matches the corresponding entry in the registry's `workflows` object
4. Add a test for user guidance templates:
   - Template file exists
   - Template file contains expected template sections

**Acceptance criteria:**
- [ ] Registry validation test passes
- [ ] Agent file cross-reference test passes
- [ ] Workflow-registry consistency test passes
- [ ] All existing 200+ tests continue to pass

## Task 3: Verify backwards compatibility

**Requirements:**
1. Run the full test suite: `npm test`
2. Verify state.json format hasn't changed (R5.1) — check the template state.json still has all required fields
3. Verify all commands still reference valid files

**Acceptance criteria:**
- [ ] `npm test` passes with 0 failures
- [ ] Template state.json unchanged
- [ ] No broken file references in commands
