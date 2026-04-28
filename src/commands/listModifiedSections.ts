import { handler, type ListModifiedSectionsInput } from '../mcp/tools/listModifiedSections.js';

export async function runListModifiedSections(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionArg = args.indexOf('--mission');
  const mission = missionArg !== -1 ? args[missionArg + 1] : undefined;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert list-modified-sections [--mission <slug>] [--json]

List mission documents with CONCERT:MODIFIED markers.

Options:
  --mission <slug>  Target mission (default: active)
  --json            Output as JSON
  --help, -h        Show this help`);
    return 0;
  }

  const input: ListModifiedSectionsInput = mission ? { mission } : {};
  const output = await handler(input, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return 0;
  }

  // Human-readable output
  if (output.length === 0) {
    console.log('No modified sections found');
    return 0;
  }

  for (const doc of output) {
    if (doc.wholeDoc) {
      console.log(`${doc.doc}: * (whole doc)`);
    } else {
      console.log(`${doc.doc}: ${doc.sectionSlugs.join(', ')}`);
    }
  }

  return 0;
}
