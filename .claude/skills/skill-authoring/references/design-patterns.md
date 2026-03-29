## 5 Core Agent Design Patterns

### 1. Tool Wrapper
Packages a library or technology's conventions into enforceable rules.

**Structure:** SKILL.md contains the rules as a numbered checklist. `references/` holds the detailed rationale, edge cases, and code examples that the agent loads only when applying a specific rule.

**Example:** A `typescript-standards` skill where SKILL.md lists 15 rules as a quick-reference checklist, and `references/rules-detail.md` has the full explanation with code samples for each.

### 2. Generator
Produces structured output by filling a reusable template.

**Structure:** SKILL.md describes the workflow for gathering inputs and generating output. `assets/` holds the output template(s) that the agent reads and fills in.

**Example:** A `changelog-generator` skill where SKILL.md walks through extracting commits, categorizing changes, and formatting. `assets/changelog-template.md` provides the exact output structure.

### 3. Reviewer
Evaluates code or artifacts against a checklist.

**Structure:** SKILL.md describes the review protocol (how to review). `references/` holds the checklist (what to check). This separation means the checklist can be updated independently.

**Example:** A `security-review` skill where SKILL.md says "For each file, apply the checklist" and `references/owasp-checklist.md` contains the specific vulnerabilities to check.

### 4. Inversion
Interviews the user before acting. Prevents the agent from making assumptions.

**Structure:** SKILL.md defines phases (interview → validate → act) with an explicit gate: "DO NOT start building until all interview phases are complete." Questions are in SKILL.md; execution instructions are in `references/`.

**Example:** A `project-scaffold` skill that asks about framework, language, deployment target, and testing strategy before generating any files.

### 5. Pipeline
Sequential steps with explicit gate conditions between them.

**Structure:** SKILL.md defines numbered steps where each step has a completion condition. Gates prevent skipping: "Do NOT proceed to Step 3 until the user confirms Step 2 output."

**Example:** A `database-migration` skill: Step 1 generates the migration, Step 2 shows a dry-run diff, gate requires user confirmation, Step 3 applies the migration.
