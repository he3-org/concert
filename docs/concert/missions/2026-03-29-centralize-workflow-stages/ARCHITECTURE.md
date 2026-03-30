# Architecture: Centralize Workflow Stage Definitions

## Overview

Introduce a machine-readable stage registry (`docs/concert/stage-registry.jsonc`) as the single source of truth for all pipeline stage definitions. Workflow files become thin stage-list selectors. Agents read stage metadata from the registry instead of embedding routing logic or document mappings.

## Key Design Decisions

### D1: Registry Format — JSONC

Use JSONC (JSON with comments) to match `concert.jsonc` conventions. The registry is a single file, not a directory of per-stage files, because:
- Stages are interdependent (ordering, transitions) — a single file makes the graph visible
- The total data is small (~100 lines) — no need to split
- Agents need to look up adjacent stages, which requires loading the full list anyway

### D2: Registry Location — `docs/concert/stage-registry.jsonc`

Ships alongside `concert.jsonc` and workflows in `docs/concert/`. This keeps all Concert configuration in one tree. The file ships via the existing live-file mechanism (`LIVE_FILE_SOURCES` in `src/lib/copy.ts`).

### D3: Workflow Files Become Stage Lists

Workflow files (`CONCERT-WORKFLOW-MISSION-*.md`) retain their markdown format and prose sections (overview, review points, failure handling, rollback) but replace the duplicated stage details table and per-stage sections with a reference to the registry:

```markdown
## Stages

Stages: vision, requirements, architecture, tasks, execution, verification, retrospective

→ See `docs/concert/stage-registry.jsonc` for stage details (agent, inputs, outputs, transitions).
```

The "Stages" line is a parseable declaration that agents can extract. The detailed "Stage Details" sections (### Stage 1: Vision, etc.) are removed — that information lives in the registry.

### D4: Agent Decoupling Strategy

Agents don't parse JSONC directly. Instead, each agent references the registry as a boot-sequence read, and the registry contains enough metadata for the agent to determine its context:

**`concert-continue`** — Replace the hardcoded if/then block (lines 57-61) with:
```
Read `docs/concert/stage-registry.jsonc` → find the entry where `name` matches state.json `stage` → read the `agent` field → read that agent file and follow its instructions.
```

**`concert-reviewer`** — Replace the hardcoded pipeline→document mapping (lines 55-59) with:
```
Read `docs/concert/stage-registry.jsonc` → find the entry where `name` matches the stage with `"draft"` status → read the `output_template` field → construct the document path.
```

**`concert-status`** — Replace workflow-file parsing with:
```
Read `docs/concert/stage-registry.jsonc` → read the active workflow file for the stage list → render pipeline progress using registry stage names.
```

**Planning agents** (analyst, architect, designer, planner) — Remove hardcoded "Next steps" blocks from `<user_guidance>`. Instead, each agent reads the registry to determine its stage name and the next stage name, then generates guidance from a template pattern.

### D5: User Guidance Templates

Create `docs/concert/templates/user-guidance.md` containing template patterns for common messaging:

```markdown
## Stage Draft Complete
✅ {stage_display} drafted: {document_path}

📋 Next steps:
  → Review {stage_name}:     /concert:review
    (reviews {document_path})
  → Accept and advance:      /concert:accept
  → Check status:            /concert:status

## Stage Accepted
✅ {stage_name} accepted — advancing to {next_stage}

📋 Next steps:
  → Continue to {next_stage}: /concert:continue
  → Check status:             /concert:status
```

Templates use `{variable}` syntax. Agents read the template file, substitute variables from the registry + state.json, and output the result. Templates include both CLI and GitHub UI variants when `concert.jsonc` → `user_guidance.show_both_cli_and_ui_options` is true.

### D6: Registry Ships via Live-File Mechanism

Add `stage-registry.jsonc` to the live-file copy logic. Options:
- **Option A:** Add a new entry to `LIVE_FILE_SOURCES` for individual files in `docs/concert/`
- **Option B:** Ship it as part of the existing `docs/concert/workflows` directory copy

**Decision: Option A** — Add the registry file explicitly. The workflow directory copy has recursive behavior that would pick up unrelated files. A targeted file copy is safer.

Similarly, `docs/concert/templates/` is added as a new live-file source directory.

## Data Model

### Stage Registry Schema

```jsonc
// docs/concert/stage-registry.jsonc
{
  "stages": [
    {
      "name": "vision",                           // R1.1: name
      "order": 1,                                  // R1.1: order
      "agent": "concert-init.md",                  // R1.1: agent filename
      "inputs": ["user input", "existing specs"],  // R1.1: what the agent reads
      "outputs": ["VISION.md"],                    // R1.1: what the agent produces
      "output_template": "VISION.md",              // R1.1: filename pattern
      "triggers_review": true,                     // R1.1: triggers review cycle
      "produces_spec": "VISION-SPEC.md",           // R1.1: optional spec filename
      "interactive": true,                         // bonus: agent interactivity
      "display_name": "Vision"                     // for user-facing messages
    },
    {
      "name": "requirements",
      "order": 2,
      "agent": "concert-analyst.md",
      "inputs": ["VISION.md", "codebase", "REQUIREMENTS-SPEC.md"],
      "outputs": ["REQUIREMENTS.md"],
      "output_template": "REQUIREMENTS.md",
      "triggers_review": true,
      "produces_spec": "REQUIREMENTS-SPEC.md",
      "interactive": false,
      "display_name": "Requirements"
    },
    {
      "name": "architecture",
      "order": 3,
      "agent": "concert-architect.md",
      "inputs": ["VISION.md", "REQUIREMENTS.md", "ARCHITECTURE-SPEC.md"],
      "outputs": ["ARCHITECTURE.md"],
      "output_template": "ARCHITECTURE.md",
      "triggers_review": true,
      "produces_spec": "ARCHITECTURE-SPEC.md",
      "interactive": false,
      "display_name": "Architecture"
    },
    {
      "name": "ux",
      "order": 4,
      "agent": "concert-designer.md",
      "inputs": ["all mission docs", "platform UX skills"],
      "outputs": ["UX.md"],
      "output_template": "UX.md",
      "triggers_review": true,
      "produces_spec": "UX-SPEC.md",
      "interactive": false,
      "display_name": "UX Design"
    },
    {
      "name": "tasks",
      "order": 5,
      "agent": "concert-planner.md",
      "inputs": ["all mission docs", "all specs", "codebase"],
      "outputs": ["phases/"],
      "output_template": "phases/",
      "triggers_review": true,
      "produces_spec": null,
      "interactive": false,
      "display_name": "Task Planning"
    },
    {
      "name": "execution",
      "order": 6,
      "agent": "concert-coder.md",
      "inputs": ["TASK files"],
      "outputs": ["code", "PHASE-SUMMARY files"],
      "output_template": null,
      "triggers_review": false,
      "produces_spec": null,
      "interactive": false,
      "display_name": "Execution"
    },
    {
      "name": "verification",
      "order": 7,
      "agent": "concert-verifier.md",
      "inputs": ["REQUIREMENTS-SPEC.md", "PHASE-SUMMARY files"],
      "outputs": ["VERIFICATION.md", "COST-REPORT.md"],
      "output_template": "VERIFICATION.md",
      "triggers_review": false,
      "produces_spec": null,
      "interactive": true,
      "display_name": "Verification"
    },
    {
      "name": "retrospective",
      "order": 8,
      "agent": "concert-retrospective.md",
      "inputs": ["telemetry", "COST-REPORT.md", "failure_log", "mission docs"],
      "outputs": ["CONCERT-IMPROVEMENT.md"],
      "output_template": "CONCERT-IMPROVEMENT.md",
      "triggers_review": false,
      "produces_spec": null,
      "interactive": false,
      "display_name": "Retrospective"
    }
  ],

  "workflows": {
    "mission-full": ["vision", "requirements", "architecture", "ux", "tasks", "execution", "verification", "retrospective"],
    "mission-medium": ["vision", "requirements", "architecture", "tasks", "execution", "verification", "retrospective"],
    "mission-small": ["vision", "tasks", "execution", "verification"]
  }
}
```

### Workflow Variants in Registry

The `workflows` object in the registry defines which stages each variant includes (R1.4). This replaces the need for each workflow file to duplicate the stage table. Workflow markdown files still exist for prose documentation (review points, failure handling, rollback rules) but reference the registry for stage data.

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `docs/concert/stage-registry.jsonc` | Stage definitions and workflow variants (R1) |
| `docs/concert/templates/user-guidance.md` | User-facing message templates (R3) |

### Modified Files

| File | Change |
|------|--------|
| `.claude/agents/concert-continue.md` | Replace if/then routing with registry lookup (R2.1) |
| `.claude/agents/concert-reviewer.md` | Replace hardcoded document mapping with registry lookup (R2.2) |
| `.claude/agents/concert-status.md` | Read stage list from registry (R2.3) |
| `.claude/agents/concert-analyst.md` | Replace bespoke user_guidance with template reference (R2.4, R3.2) |
| `.claude/agents/concert-architect.md` | Replace bespoke user_guidance with template reference (R2.4, R3.2) |
| `.claude/agents/concert-designer.md` | Replace bespoke user_guidance with template reference (R2.4, R3.2) |
| `.claude/agents/concert-planner.md` | Replace bespoke user_guidance with template reference (R2.4, R3.2) |
| `docs/concert/workflows/CONCERT-WORKFLOW-MISSION-FULL.md` | Remove stage details, reference registry (R4.1, R4.4) |
| `docs/concert/workflows/CONCERT-WORKFLOW-MISSION-MEDIUM.md` | Remove stage details, reference registry (R4.2, R4.4) |
| `docs/concert/workflows/CONCERT-WORKFLOW-MISSION-SMALL.md` | Remove stage details, reference registry (R4.3, R4.4) |
| `src/lib/copy.ts` | Add registry + templates to live-file shipping (R1.3) |
| `src/__tests__/templates.test.ts` | Add registry validation tests (R6) |

### Unchanged

| File | Reason |
|------|--------|
| `docs/concert/state.json` | Format unchanged per R5.1 |
| `.claude/commands/concert/*` | Commands work identically per R5.2 |
| `concert.jsonc` | No configuration changes needed |

## Agent Boot Sequence Changes

### Before (concert-continue)
```
Read state.json → if stage == "requirements" → read concert-analyst.md
                → if stage == "architecture" → read concert-architect.md
                → if stage == "ux" → read concert-designer.md
                → if stage == "tasks" → read concert-planner.md
```

### After (concert-continue)
```
Read state.json → Read stage-registry.jsonc → find stage entry by name → read entry.agent → follow agent instructions
```

### Before (concert-reviewer)
```
if pipeline.vision == "draft" → review VISION.md
if pipeline.requirements == "draft" → review REQUIREMENTS.md
if pipeline.architecture == "draft" → review ARCHITECTURE.md
if pipeline.ux == "draft" → review UX.md
```

### After (concert-reviewer)
```
Read state.json → find stage with "draft" status → Read stage-registry.jsonc → find stage entry → use entry.output_template to construct document path
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Agent fails to parse JSONC | Low | High | Agents already read concert.jsonc successfully; same format |
| Registry and agent definitions drift | Medium | Medium | Test (R6.1) validates all agent files referenced in registry exist |
| Workflow files lose useful prose | Low | Medium | Keep prose sections intact; only remove duplicated stage tables |
| Template variables not substituted correctly | Medium | Low | Templates are simple string replacement; agents already do this for user guidance |

## Migration Path

1. Create registry file with all stage definitions
2. Create user guidance templates
3. Update `concert-continue` to use registry lookup (highest-impact change)
4. Update `concert-reviewer` to use registry lookup
5. Update `concert-status` to use registry lookup
6. Update planning agents to use guidance templates
7. Simplify workflow files (remove duplicated stage details)
8. Add registry to live-file shipping
9. Add tests
10. Verify all 200+ existing tests pass
