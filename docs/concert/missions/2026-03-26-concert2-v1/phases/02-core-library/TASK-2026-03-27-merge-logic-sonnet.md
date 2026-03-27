---
task: "merge-logic"
title: "Implement deepMergeJsonc for surgical config and state merging"
depends_on: ["types", "config-helpers", "state-helpers"]
wave: 2
model: sonnet
---

## Objective

Implement the `deepMergeJsonc` function that performs surgical merging of JSON/JSONC files during `concert update`. This is the most nuanced piece of logic in the npm package — it must correctly handle adding new fields, preserving user values, removing deprecated fields, and preserving comments in JSONC files.

## Files

- `src/lib/merge.ts`
- `src/__tests__/merge.test.ts`

## Requirements

- FR-013: Update Mechanism
- Architecture Section 6: Surgical Merge Strategy

## Merge Rules

The merge strategy from ARCHITECTURE.md Section 6:

| Scenario | Behavior |
|----------|----------|
| New field in schema, absent in user's file | Add with default value |
| Field exists in both schema and user's file | Preserve user's value |
| Field removed from schema | Remove from user's file |
| Nested object (e.g., `pipeline`) | Recursive merge — same rules apply |
| Array fields (`history`, `telemetry`, etc.) | Preserve user's array as-is |
| Type mismatch (schema says number, user has string) | Preserve user's value, log warning |

## Implementation Notes

Two separate functions are needed:

1. **`mergeState`** — for state.json (plain JSON). Works with parsed objects. Returns a merged object.

2. **`mergeConfig`** — for concert.jsonc (JSONC with comments). Uses `jsonc-parser`'s `modify` API to preserve comments. Takes raw text + template defaults, returns modified raw text.

### mergeState

```typescript
export interface MergeReport {
  added: string[];    // "cost.new_field"
  removed: string[];  // "deprecated_field"
  warnings: string[]; // "Type mismatch: pipeline.tasks expected string, got number"
}

export function mergeState(
  current: Record<string, unknown>,
  template: Record<string, unknown>,
): { merged: Record<string, unknown>; report: MergeReport }
```

### mergeConfig

```typescript
export function mergeConfig(
  currentRaw: string,
  template: Record<string, unknown>,
): { mergedRaw: string; report: MergeReport }
```

Uses `jsonc-parser.modify()` to add new fields and `jsonc-parser.modify()` with `undefined` to remove deprecated fields, preserving surrounding comments.

## Tests

Write comprehensive tests in `src/__tests__/merge.test.ts`:

1. New fields are added from template to current
2. Existing user values are preserved (not overwritten by template defaults)
3. Deprecated fields are removed from current
4. Nested objects are merged recursively
5. Array fields in current are preserved as-is
6. Type mismatches produce warnings but preserve user's value
7. Deep nesting works correctly (3+ levels)
8. Empty current object gets all template fields
9. `mergeConfig` preserves JSONC comments when adding fields
10. `mergeConfig` preserves JSONC comments when removing fields
11. `mergeConfig` handles the full concert.jsonc template correctly
12. Report accurately lists all additions, removals, and warnings

## Acceptance Criteria

- [ ] New schema fields are added with default values
- [ ] Existing user values are never overwritten
- [ ] Deprecated fields are cleaned up
- [ ] Nested objects are recursively merged
- [ ] Arrays are preserved as-is (not merged element-by-element)
- [ ] Type mismatches produce warnings but don't crash
- [ ] JSONC comments are preserved during config merge
- [ ] Merge reports are complete and accurate
- [ ] All tests pass
- [ ] `npm run typecheck` passes

## Skills

- docs/concert/skills/typescript-standards/SKILL.md
