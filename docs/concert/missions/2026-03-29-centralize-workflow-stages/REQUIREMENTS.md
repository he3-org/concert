# Requirements: Centralize Workflow Stage Definitions

## R1: Stage Definition Registry

Create a structured stage definition file that serves as the single source of truth for all pipeline stages.

**R1.1** — Each stage definition must include: `name`, `order`, `agent` (filename in `.claude/agents/`), `inputs` (files the agent reads), `outputs` (files the agent produces), `triggers_review` (boolean), `produces_spec` (optional spec filename), and `output_template` (filename pattern for the stage's output document).

**R1.2** — The registry must be a data file (JSON or JSONC), not markdown. It must be machine-readable so agents can look up their stage context programmatically rather than parsing prose.

**R1.3** — The registry must ship in the npm package via the existing live-file mechanism and be overwritten on `concert update`.

**R1.4** — Workflow variants (full, medium, small) must reference stage definitions by name rather than duplicating them. A workflow variant is a list of stage names to include, not a copy of each stage's details.

## R2: Agent Decoupling

Remove hardcoded stage routing and pipeline knowledge from agent definitions.

**R2.1** — `concert-continue` must read stage→agent mappings from the registry instead of embedding if/then routing logic. The execution flow must work by: read current stage from state.json → look up agent for that stage in registry → read and follow that agent's instructions.

**R2.2** — `concert-reviewer` must read stage→document mappings from the registry instead of hardcoded `pipeline.<stage> == "draft"` → document mappings.

**R2.3** — `concert-status` must read pipeline stage list from the registry to render progress displays, instead of reading stage lists from workflow markdown files.

**R2.4** — Planning agents (analyst, architect, designer, planner) must not embed knowledge about what stage comes after them. The "next steps" messaging must be generated from the registry's transition data.

## R3: Centralized User Guidance Templates

Extract user-facing messaging into templates that reference stage data.

**R3.1** — Create a set of user guidance templates for common messaging patterns: stage draft complete, stage accepted, review prompt, failure recovery, mission status. Templates use variables like `{stage_name}`, `{document_path}`, `{next_stage}`.

**R3.2** — Agents must reference these templates rather than embedding bespoke "Next steps" blocks. The templates live in a known location that agents can read.

**R3.3** — Templates must support both CLI and GitHub UI variants (per `concert.jsonc` → `user_guidance.show_both_cli_and_ui_options`).

## R4: Workflow Variant Simplification

Simplify workflow files to reference the registry rather than duplicating stage details.

**R4.1** — `CONCERT-WORKFLOW-MISSION-FULL.md` must reference stages by name: `stages: [vision, requirements, architecture, ux, tasks, execution, verification, retrospective]` rather than containing a full stage details table.

**R4.2** — `CONCERT-WORKFLOW-MISSION-MEDIUM.md` defines its subset: `stages: [vision, requirements, architecture, tasks, execution, verification]`.

**R4.3** — `CONCERT-WORKFLOW-MISSION-SMALL.md` defines its subset: `stages: [vision, tasks, execution, verification]`.

**R4.4** — Stage details (agent, inputs, outputs, review triggers) that are currently duplicated in each workflow file must be removed in favor of a single reference to the registry.

## R5: Backwards Compatibility

**R5.1** — `state.json` format must not change. Existing field names (`stage`, `pipeline`, `workflow`, `workflow_path`) remain identical.

**R5.2** — All existing commands (`/concert:continue`, `/concert:review`, `/concert:accept`, etc.) must work identically from the user's perspective.

**R5.3** — `concert update` must install the new registry file alongside existing files without breaking existing installations.

## R6: Testing

**R6.1** — Add a test that validates the stage registry file is parseable and all referenced agent files exist.

**R6.2** — Add a test that validates each workflow variant only references stages defined in the registry.

**R6.3** — All existing 200 tests must continue to pass.
