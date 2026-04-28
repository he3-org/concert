import { handler, type GetSectionInput } from '../mcp/tools/getSection.js';

export async function runGetSection(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionArg = args.indexOf('--mission');
  const mission = missionArg !== -1 ? args[missionArg + 1] : undefined;

  const positional = args.filter((a) => !a.startsWith('--') && a !== mission);
  const doc = positional[0];
  const section = positional[1];

  if (args.includes('--help') || args.includes('-h') || !doc || !section) {
    console.log(`Usage: concert get-section <doc> <section> [--mission <slug>] [--json]

Get a specific markdown section from a mission document.

Arguments:
  <doc>      Document path (relative to mission path or absolute under cwd)
  <section>  Section slug

Options:
  --mission <slug>  Target mission (default: active)
  --json            Output as JSON
  --help, -h        Show this help`);
    return doc && section ? 0 : 2;
  }

  const input: GetSectionInput = { doc, section };
  if (mission) input.mission = mission;

  const output = await handler(input, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return 0;
  }

  // Human-readable output
  console.log(`Document: ${output.doc}`);
  console.log(`Section: ${output.section}`);
  console.log(`Found: ${output.found}`);
  if (output.found && output.heading) {
    console.log(`Heading: ${output.heading}`);
    console.log(`Modified: ${output.modifiedMarker ?? false}`);
    console.log('');
    console.log(output.body ?? '');
  }

  return 0;
}
