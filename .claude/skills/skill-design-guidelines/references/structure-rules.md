## Directory and Structural Rules

- **Flat Subdirectories:** Keep all supporting files exactly one level deep. Do not nest folders inside `references/`, `scripts/`, or `assets/`.
- **Create on Demand:** Do not create empty subdirectories. Add `references/`, `scripts/`, or `assets/` only when the first file for that category is needed.
- **references/:** Input to the agent's thinking — API docs, cheatsheets, domain logic, rule sets, and checklists that inform decisions.
- **scripts/:** Executable code for deterministic tasks. Do not bundle long-lived library code here.
- **assets/:** Output templates and schemas that the agent fills in or generates from — JSON schemas, file templates, boilerplate structures.
- **No Human Docs:** Skills are for agents. Do not create `README.md`, `CHANGELOG.md`, or `INSTALLATION_GUIDE.md` inside the skill directory.
- **Pathing:** Always use relative paths with forward slashes (`/`), regardless of the OS.
