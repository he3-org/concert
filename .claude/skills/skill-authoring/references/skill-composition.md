## Skill Composition Rules

When multiple skills are active simultaneously, conflicts degrade agent performance. These rules prevent that.

### Scope Declaration

Every skill must declare its scope in the `description` field using both positive and negative triggers. The narrower the scope, the less likely a collision.

**Good:** "Enforces TypeScript strict-mode patterns. Use when writing or reviewing .ts/.tsx files. Do not use for JavaScript-only projects or runtime validation logic."

**Bad:** "Helps write better code." (Collides with every other coding skill.)

### Conflict Resolution

When two skills give contradictory guidance for the same file or task:

1. **More specific wins.** A `react-testing` skill overrides `typescript-standards` on how to type test utilities, because it has narrower scope.
2. **Explicit override wins.** If a skill says "Override rule X from skill Y when Z," that takes precedence.
3. **When ambiguous, ask.** If the agent cannot determine which skill applies, it should surface the conflict to the user rather than guess.

### Layering Pattern

Skills should layer cleanly:

- **Language skills** (typescript-standards, go-standards) — apply to all files of that language
- **Domain skills** (cli-ux-guidelines, security-review) — apply to specific subsystems
- **Workflow skills** (skill-authoring, changelog-generator) — apply to specific tasks

An agent working on a CLI command in TypeScript would activate `typescript-standards` (language layer) + `cli-ux-guidelines` (domain layer). The language skill governs type safety; the domain skill governs UX patterns. No overlap.

### Anti-Patterns

- **Two skills governing the same file type with different rules.** Pick one or merge them.
- **A skill that says "always do X" conflicting with another that says "never do X."** One must explicitly override the other.
- **Skills that duplicate content.** If two skills both explain error handling, extract it into a shared skill and reference it from both.
