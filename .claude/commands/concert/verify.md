# /concert:verify

Acceptance testing of completed work.

## Steps

1. Read `docs/concert/state.json` → get mission_path, workflow_path
2. Read `docs/concert/REQUIREMENTS-SPEC.md` + completed `PHASE-SUMMARY-*.md` files
3. Extract testable deliverables from requirements
4. Spawn the `concert-qa` agent (see `docs/concert/agents/concert-qa.md`)
5. QA agent checks: "what must be TRUE?" against actual implementation
6. If issues found: spawn debugger, auto-create gap-closure task files
7. Write `VERIFICATION.md` in the last phase directory
8. Generate `COST-REPORT.md` in the mission folder (per `CONCERT-WORKFLOW-OBSERVABILITY.md`)
9. If `self_improvement.enabled`: spawn `concert-retrospective` → generates `CONCERT-IMPROVEMENT.md`
10. If clean and `status_display` is `"wip_pr"`: mark WIP PR as ready for review
11. Update `state.json` and human status display

## Next Steps

After verify, output:
```
📋 Next steps:
  → Review verification:  docs/concert/missions/.../VERIFICATION.md
  → Cost report:          docs/concert/missions/.../COST-REPORT.md
  → Improvements:         docs/concert/missions/.../CONCERT-IMPROVEMENT.md
  → If issues found:      /concert:run (gap-closure tasks auto-generated)
  → If clean:             Mission complete! Create PR for human review.
```
