## Structure and Packaging Rules

### Directory Hierarchy

Every skill resides in a dedicated folder. The folder name must match the skill `name` (1-64 characters, lowercase letters, numbers, and hyphens only).

Required entry point:
- `SKILL.md` — the single entry point the agent loads on activation.

Optional subdirectories (create only when the first file is needed):
- `references/` — on-demand documentation the agent reads during execution (API docs, checklists, rule sets).
- `scripts/` — executable code for deterministic tasks (parsing, validation, data transformation).
- `assets/` — output templates and schemas the agent fills in or generates from.

Keep all supporting files exactly one level deep. Do not nest folders inside subdirectories.

### Directory Scoping

- **Project-level skills:** Place in `.agents/skills/` or `.cursor/skills/` for project-specific logic.
- **Global skills:** Reserve `~/.cursor/skills/` for user-level capabilities shared across projects.

### Frontmatter Validation

Every `SKILL.md` must lead with a YAML block containing:
- `name` — 1-64 characters, lowercase letters, numbers, and hyphens only.
- `description` — under 1024 characters, keyword-rich, written in third person.

Use the format: "Tool to [Action]. Use when [Context]. Do not use when [Negative Context]."

### Invocation Control

Set `disable-model-invocation: true` for specialized utility skills. This forces slash-command-only behavior, preventing the skill from being loaded unless explicitly requested. Use this to avoid context pollution from auto-invoked skills.

### File Path Conventions

Use forward slashes (`/`) for all internal path references. This ensures cross-platform compatibility across Windows, macOS, and Linux.
