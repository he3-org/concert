import { handler, type ClearSectionModifiedInput } from '../mcp/tools/clearSectionModified.js';

export async function runClearSectionModified(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionIdx = args.indexOf('--mission');
  const mission = missionIdx !== -1 ? args[missionIdx + 1] : undefined;

  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--mission') {
      i++; // skip its value
      continue;
    }
    if (a.startsWith('--')) continue;
    positional.push(a);
  }
  const doc = positional[0];
  const sections = positional.slice(1);

  if (args.includes('--help') || args.includes('-h') || !doc || sections.length === 0) {
    console.log(`Usage: concert clear-section-modified <doc> <section> [<section>...] [options]

Remove one or more CONCERT:MODIFIED markers from a document. Pass multiple
section slugs to clear them in a single locked read/write/event.

Arguments:
  <doc>      Document path (relative to mission)
  <section>  One or more section slugs

Options:
  --mission <slug>  Target mission (default: active)
  --json            Output as JSON
  --help, -h        Show this help`);
    return doc && sections.length > 0 ? 0 : 2;
  }

  const input: ClearSectionModifiedInput =
    sections.length === 1 ? { doc, section: sections[0]! } : { doc, sections };
  if (mission) input.mission = mission;

  const output = await handler(input, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return output.ok ? 0 : 1;
  }

  if (!output.ok) {
    console.error(`Error: ${output.error}`);
    return 1;
  }

  if (output.results) {
    for (const r of output.results) {
      console.log(`Cleared ${output.doc}#${r.section}${r.removed ? '' : ' (was not marked)'}`);
    }
  } else {
    console.log(
      `Cleared ${output.doc}#${output.section}${output.removed ? '' : ' (was not marked)'}`
    );
  }
  return 0;
}
