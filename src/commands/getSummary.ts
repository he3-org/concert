import { withCache } from '../cache/cache.js';
import { handler as getSummaryHandler } from '../mcp/tools/getSummary.js';

export async function runGetSummary(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert summary [--json]

Display a cross-mission summary showing task counts, gaps, and refactor items.

Options:
  --json    Output as JSON
  --help    Show this help`);
    return 0;
  }

  try {
    const result = await getSummaryHandler({}, { cwd });

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }

    // Table output
    if (result.missions.length === 0) {
      console.log('No missions found.');
      return 0;
    }

    // Calculate column widths
    const maxSlug = Math.max(...result.missions.map((m) => m.slug.length), 7);
    const maxStage = Math.max(...result.missions.map((m) => (m.stage ?? '-').length), 5);

    // Header
    const header = `${pad('Mission', maxSlug)}  ${pad('Stage', maxStage)}  ${pad('Tasks', 14)}  ${pad('Gaps (open)', 16)}  ${pad('Refactor (open)', 15)}`;
    console.log(header);

    // Rows
    for (const m of result.missions) {
      const tasksSummary = `${m.tasksDone}/${m.tasksTotal} done`;
      const gapsSummary = `${m.gapsCritical}C ${m.gapsMajor}M ${m.gapsMinor}m ${m.gapsNice}N`;
      const refactorSummary = `${m.refactorP0}P0 ${m.refactorP1}P1 ${m.refactorP2}P2`;
      console.log(
        `${pad(m.slug, maxSlug)}  ${pad(m.stage ?? '-', maxStage)}  ${pad(tasksSummary, 14)}  ${pad(gapsSummary, 16)}  ${pad(refactorSummary, 15)}`
      );
    }

    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    return 1;
  }
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}
