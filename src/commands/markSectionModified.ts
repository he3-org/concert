import { handler, type MarkSectionModifiedInput } from '../mcp/tools/markSectionModified.js';

export async function runMarkSectionModified(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionIdx = args.indexOf('--mission');
  const mission = missionIdx !== -1 ? args[missionIdx + 1] : undefined;
  const sourceIdx = args.indexOf('--source');
  const source = sourceIdx !== -1 ? args[sourceIdx + 1] : undefined;

  const positional = args.filter(
    (a, i) =>
      !a.startsWith('--') &&
      a !== mission &&
      (i === 0 || args[i - 1] !== '--mission') &&
      a !== source &&
      (i === 0 || args[i - 1] !== '--source')
  );
  const doc = positional[0];
  const section = positional[1];

  if (args.includes('--help') || args.includes('-h') || !doc || !section) {
    console.log(`Usage: concert mark-section-modified <doc> <section> [options]

Mark a section as modified by inserting or refreshing a CONCERT:MODIFIED marker.

Arguments:
  <doc>      Document path (relative to mission)
  <section>  Section slug

Options:
  --mission <slug>  Target mission (default: active)
  --source <ref>    Optional source reference
  --json            Output as JSON
  --help, -h        Show this help`);
    return doc && section ? 0 : 2;
  }

  const input: MarkSectionModifiedInput = { doc, section };
  if (mission) input.mission = mission;
  if (source) input.source = source;

  const output = await handler(input, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return output.ok ? 0 : 1;
  }

  if (output.ok) {
    console.log(
      `Marked ${output.doc}#${output.section}${output.alreadyMarked ? ' (refreshed)' : ''}`
    );
    return 0;
  } else {
    console.error(`Error: ${output.error}`);
    return 1;
  }
}
