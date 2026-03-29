## Verification and Feedback Loops

Active verification prevents surface-level output. These patterns force the agent to interrogate its own logic against external reality.

### Sub-Domain Historian

Construct a chronological "domain narrative" that places the current task in context:
- Identify seminal work and recent developments in the relevant domain.
- Assess significance beyond the training data cutoff.
- Flag areas where the agent's knowledge may be stale or incomplete.

### Baseline Scout

Act as an adversarial auditor before finalizing output:
- Search for state-of-the-art benchmarks relevant to the task (e.g., TCGA for medical, HumanEval for code).
- Identify missing comparisons or omitted datasets.
- Verify that claimed improvements are measured against current baselines, not outdated ones.

### Interrogation Log

Generate probing questions (`Q_probe`) to investigate the agent's own claims:
1. For each major claim in the output, ask: "What evidence supports this?"
2. Cross-reference against verified external sources.
3. Log every discrepancy between the agent's claim and verified references.
4. Resolve or flag each discrepancy before finalizing.

Never trust the first pass. The interrogation log is the quality gate.

### Guidelines-Driven Synthesis

Condition the final review on project-specific or venue-specific standards:
- Apply the relevant checklist (e.g., ICLR novelty requirements, NeurIPS experimental rigor, internal team conventions).
- Verify the output adheres to each checklist item.
- Document which standards were applied and any deviations.
