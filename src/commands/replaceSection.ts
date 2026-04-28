import * as fs from 'node:fs';
import { handler, type ReplaceSectionInput } from '../mcp/tools/replaceSection.js';

export async function runReplaceSection(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionIdx = args.indexOf('--mission');
  const mission = missionIdx !== -1 ? args[missionIdx + 1] : undefined;
  const bodyIdx = args.indexOf('--body');
  const bodyInline = bodyIdx !== -1 ? args[bodyIdx + 1] : undefined;
  const bodyFileIdx = args.indexOf('--body-file');
  const bodyFile = bodyFileIdx !== -1 ? args[bodyFileIdx + 1] : undefined;

  const positional = args.filter(
    (a, i) =>
      !a.startsWith('--') &&
      a !== mission &&
      (i === 0 || args[i - 1] !== '--mission') &&
      a !== bodyInline &&
      (i === 0 || args[i - 1] !== '--body') &&
      a !== bodyFile &&
      (i === 0 || args[i - 1] !== '--body-file')
  );
  const doc = positional[0];
  const section = positional[1];

  if (args.includes('--help') || args.includes('-h') || !doc || !section) {
    console.log(`Usage: concert replace-section <doc> <section> [options]

Replace the body of a section while preserving its heading.

Arguments:
  <doc>      Document path (relative to mission)
  <section>  Section slug

Options:
  --body <text>       New body content (inline)
  --body-file <path>  Read new body from file
  --mission <slug>    Target mission (default: active)
  --json              Output as JSON
  --help, -h          Show this help

If neither --body nor --body-file is provided and stdin is not a TTY, reads from stdin.`);
    return doc && section ? 0 : 2;
  }

  let newBody: string;
  if (bodyInline) {
    newBody = bodyInline;
  } else if (bodyFile) {
    newBody = fs.readFileSync(bodyFile, 'utf-8');
  } else if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    newBody = Buffer.concat(chunks).toString('utf-8');
  } else {
    console.error('Error: --body, --body-file, or stdin required');
    return 2;
  }

  const input: ReplaceSectionInput = { doc, section, newBody };
  if (mission) input.mission = mission;

  const output = await handler(input, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return output.ok ? 0 : 1;
  }

  if (output.ok) {
    console.log(`Replaced ${output.doc}#${output.section} (${output.bytesWritten} bytes)`);
    return 0;
  } else {
    console.error(`Error: ${output.error}`);
    return 1;
  }
}
