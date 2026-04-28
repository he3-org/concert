import { handler } from '../mcp/tools/listMissions.js';

export async function runListMissions(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert list-missions [--json]

List all missions in .concert/missions/.

Options:
  --json      Output as JSON
  --help, -h  Show this help`);
    return 0;
  }

  const output = await handler({}, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return 0;
  }

  // Human-readable output
  if (output.length === 0) {
    console.log('No missions found');
    return 0;
  }

  for (const mission of output) {
    const active = mission.isActive ? ' [ACTIVE]' : '';
    console.log(`${mission.slug}${active}`);
    console.log(`  Stage: ${mission.stage || '—'}`);
    console.log(`  Last touched: ${mission.lastTouchedIso || '—'}`);
  }

  return 0;
}
