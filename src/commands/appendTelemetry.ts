import * as fs from 'node:fs';
import { handler, type AppendTelemetryInput } from '../mcp/tools/appendTelemetry.js';
import type { TelemetryRecord } from '../types.js';

export async function runAppendTelemetry(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionIdx = args.indexOf('--mission');
  const mission = missionIdx !== -1 ? args[missionIdx + 1] : undefined;
  const recordFileIdx = args.indexOf('--record-file');
  const recordFile = recordFileIdx !== -1 ? args[recordFileIdx + 1] : undefined;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert append-telemetry [options]

Append a telemetry record to state.json.

Options:
  --record-file <path>  Read record from JSON file
  --mission <slug>      Target mission (default: active)
  --json                Output as JSON
  --help, -h            Show this help

If --record-file is not provided and stdin is not a TTY, reads from stdin.`);
    return 0;
  }

  let recordJson: string;
  if (recordFile) {
    recordJson = fs.readFileSync(recordFile, 'utf-8');
  } else if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    recordJson = Buffer.concat(chunks).toString('utf-8');
  } else {
    console.error('Error: --record-file or stdin required');
    return 2;
  }

  const record = JSON.parse(recordJson) as TelemetryRecord;
  const input: AppendTelemetryInput = { record };
  if (mission) input.mission = mission;

  const output = await handler(input, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return output.ok ? 0 : 1;
  }

  if (output.ok) {
    console.log(`Appended telemetry record (total: ${output.count})`);
    return 0;
  } else {
    console.error(`Error: ${output.error}`);
    return 1;
  }
}
