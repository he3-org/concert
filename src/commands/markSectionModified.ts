import { handler, type MarkSectionModifiedInput } from '../mcp/tools/markSectionModified.js';

export async function runMarkSectionModified(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionIdx = args.indexOf('--mission');
  const mission = missionIdx !== -1 ? args[missionIdx + 1] : undefined;
  const sourceIdx = args.indexOf('--source');
  const source = sourceIdx !== -1 ? args[sourceIdx + 1] : undefined;

  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--mission' || a === '--source') {
      i++; // skip its value
      continue;
    }
    if (a.startsWith('--')) continue;
    positional.push(a);
  }
  const doc = positional[0];
  const sections = positional.slice(1);

  if (args.includes('--help') || args.includes('-h') || !doc || sections.length === 0) {
    console.log(`Usage: concert mark-section-modified <doc> <section> [<section>...] [options]

Insert or refresh CONCERT:MODIFIED markers on one or more sections of a
document. Pass multiple section slugs to mark them in a single locked
read/write/event.

Arguments:
  <doc>      Document path (relative to mission)
  <section>  One or more section slugs

Options:
  --mission <slug>  Target mission (default: active)
  --source <ref>    Optional source reference applied to every marker
  --json            Output as JSON
  --help, -h        Show this help`);
    return doc && sections.length > 0 ? 0 : 2;
  }

  const input: MarkSectionModifiedInput =
    sections.length === 1 ? { doc, section: sections[0]! } : { doc, sections };
  if (mission) input.mission = mission;
  if (source) input.source = source;

  const output = await handler(input, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return output.ok ? 0 : 1;
  }

  if (output.results) {
    for (const r of output.results) {
      if (r.ok) {
        console.log(`Marked ${output.doc}#${r.section}${r.alreadyMarked ? ' (refreshed)' : ''}`);
      } else {
        console.error(`Error: ${output.doc}#${r.section}: ${r.error}`);
      }
    }
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
