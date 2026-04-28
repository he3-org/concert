import { handler, type ClearSectionModifiedInput } from '../mcp/tools/clearSectionModified.js';

export async function runClearSectionModified(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionIdx = args.indexOf('--mission');
  const mission = missionIdx !== -1 ? args[missionIdx + 1] : undefined;

  const positional = args.filter(
    (a, i) => !a.startsWith('--') && a !== mission && (i === 0 || args[i - 1] !== '--mission')
  );
  const doc = positional[0];
  const section = positional[1];

  if (args.includes('--help') || args.includes('-h') || !doc || !section) {
    console.log(`Usage: concert clear-section-modified <doc> <section> [options]

Remove a CONCERT:MODIFIED marker from a section.

Arguments:
  <doc>      Document path (relative to mission)
  <section>  Section slug

Options:
  --mission <slug>  Target mission (default: active)
  --json            Output as JSON
  --help, -h        Show this help`);
    return doc && section ? 0 : 2;
  }

  const input: ClearSectionModifiedInput = { doc, section };
  if (mission) input.mission = mission;

  const output = await handler(input, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return output.ok ? 0 : 1;
  }

  if (output.ok) {
    console.log(
      `Cleared ${output.doc}#${output.section}${output.removed ? '' : ' (was not marked)'}`
    );
    return 0;
  } else {
    console.error(`Error: ${output.error}`);
    return 1;
  }
}
