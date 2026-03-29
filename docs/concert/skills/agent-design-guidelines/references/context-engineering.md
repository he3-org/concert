## Context Engineering Rules

### Three-Tier Disclosure Model

Minimize the initial token footprint by loading context in three tiers:

1. **Tier 1 — Metadata only (~30-50 tokens).** Pre-load only `name` and `description` from frontmatter. This is what the agent sees for routing decisions.
2. **Tier 2 — SKILL.md body.** Load the full SKILL.md content only when the skill is activated.
3. **Tier 3 — References on demand.** Fetch files from `references/` only at the step where they are needed. Never pre-load all reference files.

### Internal Compression

Use a "Summary Agent" pattern to transform raw technical text into structured representations before injecting it into context:
- Extract the core claim set, proposed method, and reported evidence.
- Discard narrative filler, repeated definitions, and boilerplate.
- Preserve the agent's reasoning capacity by keeping injected context dense and actionable.

### Assume Intelligence

Do not explain concepts the model already knows. If a model like Claude already possesses domain knowledge (e.g., standard library APIs, common design patterns), exclude that information. Include only unique, project-specific context that the model cannot derive from its training data.

### Template Patterns

Mandate the use of a `#### [Specific Task] Template` section in the skill body for any structured output. Exact Markdown templates provide deterministic patterns for the agent to match. Templates are more reliable than abstract descriptions because they give the model a concrete structure to fill rather than instructions to interpret.
