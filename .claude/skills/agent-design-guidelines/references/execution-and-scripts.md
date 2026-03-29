## Execution and Scripting Rules

### Operationalize Utility Scripts

Place specialized scripts (Python, Bash, JS) in the `scripts/` directory. Offload complex operations to scripts rather than relying on LLM internal reasoning:
- Data transformations and parsing
- PDF or document extraction
- File validation and linting
- Deterministic computations

Scripts transform the agent into a reliable automation engine and reduce non-deterministic errors.

### Error Handling

All scripts must include explicit, human-readable error messages. This allows the agent to:
- Interpret the failure cause without guessing.
- Attempt self-correction without human intervention.
- Report actionable diagnostics if self-correction fails.

Bad: `exit 1`
Good: `echo "ERROR: Input file not found at '${INPUT_PATH}'. Verify the path exists and is readable." >&2; exit 1`

### Runtime Dependencies

Explicitly list required environment setups within `SKILL.md` or the relevant reference file:
- Package installations (e.g., `pip install`, `npm install`)
- Required environment variables
- Minimum runtime versions

The agent must verify and prepare the runtime environment before executing any script.

### Workflow Branching

Define execution paths using numbered, sequential steps. Use explicit branching logic to route the agent between preset templates or custom generation paths:

1. Check if a template exists for the requested output.
2. If yes, load the template from `assets/` and fill it in.
3. If no, generate custom output following the rules in `references/`.
4. Validate the output against the skill's guardrails.
