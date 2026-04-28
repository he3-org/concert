import { handler as getEventsHandler, type EventRow } from '../mcp/tools/getEvents.js';

export async function runGetEvents(cwd: string, args: string[]): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert get-events [options]

Get recent tool call events from the cache.

Options:
  --mission <slug>  Filter by mission slug
  --limit <n>       Limit results (default: 20, max: 100)
  --json            Output raw JSON
  --help            Show this help`);
    return 0;
  }

  const isJson = args.includes('--json');
  const missionIdx = args.indexOf('--mission');
  const mission = missionIdx >= 0 && args[missionIdx + 1] ? args[missionIdx + 1] : undefined;
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : undefined;

  const result = await getEventsHandler({ mission, limit }, { cwd });

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  if (result.events.length === 0) {
    console.log('No events found.');
    return 0;
  }

  console.log(
    `  ${pad('Tool', 26)} ${pad('Mission', 10)} ${pad('Status', 8)} ${pad('Duration', 10)} Time`
  );

  for (const e of result.events) {
    const missionStr = e.mission_slug || '-';
    const statusStr = e.ok ? 'ok' : 'ERROR';
    const durationStr = `${e.duration_ms}ms`;
    const timeStr = e.ts;
    console.log(
      `  ${pad(e.tool, 26)} ${pad(missionStr, 10)} ${pad(statusStr, 8)} ${pad(
        durationStr,
        10
      )} ${timeStr}`
    );
  }

  console.log(`\n  (total: ${result.total} events)`);
  return 0;
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}
