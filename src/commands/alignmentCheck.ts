import { handler, type AlignmentCheckInput } from '../mcp/tools/alignmentCheck.js';

export async function runAlignmentCheck(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionIdx = args.indexOf('--mission');
  const mission = missionIdx !== -1 ? args[missionIdx + 1] : undefined;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert alignment-check [options]

Perform mechanical alignment checks on mission documents.

Options:
  --mission <slug>  Target mission (default: active)
  --json            Output as JSON
  --help, -h        Show this help`);
    return 0;
  }

  const input: AlignmentCheckInput = {};
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

  console.log(`Alignment check:`);
  if (output.missingDocs && output.missingDocs.length > 0) {
    console.log(`  Missing docs: ${output.missingDocs.join(', ')}`);
  } else {
    console.log(`  All required docs present`);
  }

  if (output.findings && output.findings.length > 0) {
    console.log(`  Findings: ${output.findings.length}`);
    for (const f of output.findings) {
      console.log(`    [${f.severity.toUpperCase()}] ${f.kind}: ${f.message}`);
    }
    return 1;
  } else {
    console.log(`  No findings`);
    return 0;
  }
}
