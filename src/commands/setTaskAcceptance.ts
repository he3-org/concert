import * as setTaskAcceptance from '../mcp/tools/setTaskAcceptance.js';

export async function runSetTaskAcceptance(cwd: string, args: string[]): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert set-task-acceptance <task> [--index <n> | --text <s>] [--checked | --unchecked] [--mission <slug>] [--json]

Toggle an acceptance criterion in a task file.

Arguments:
  <task>            Task slug

Options:
  --index <n>       Zero-based index of the acceptance item
  --text <s>        Text to match (case-insensitive substring)
  --checked         Mark as checked (done)
  --unchecked       Mark as unchecked (pending)
  --mission <slug>  Mission slug (default: active mission)
  --json            Output as JSON
  --help            Show this help`);
    return 0;
  }

  const isJson = args.includes('--json');
  const taskArg = args.find((a) => !a.startsWith('--'));
  if (!taskArg) {
    console.error('Error: task slug required');
    return 1;
  }

  const mission = args.includes('--mission') ? args[args.indexOf('--mission') + 1] : undefined;
  const index = args.includes('--index')
    ? parseInt(args[args.indexOf('--index') + 1]!, 10)
    : undefined;
  const text = args.includes('--text') ? args[args.indexOf('--text') + 1] : undefined;
  const checked = args.includes('--checked')
    ? true
    : args.includes('--unchecked')
      ? false
      : undefined;

  if (checked === undefined) {
    console.error('Error: must specify --checked or --unchecked');
    return 1;
  }

  try {
    const result = await setTaskAcceptance.handler(
      { task: taskArg, index, text, checked, mission },
      { cwd }
    );

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (!result.ok) {
        console.log(`Failed: ${result.error}`);
      } else {
        console.log(`Updated: ${result.task}`);
        console.log(`  File: ${result.filePath}`);
        console.log(
          `  Previous: ${result.previous ? 'checked' : 'unchecked'} → Current: ${result.current ? 'checked' : 'unchecked'}`
        );
        console.log(`  Acceptance: ${result.completedAcceptance}/${result.totalAcceptance}`);
      }
    }

    return result.ok ? 0 : 1;
  } catch (err: unknown) {
    const e = err as Error;
    if (isJson) {
      console.error(JSON.stringify({ error: e.message }, null, 2));
    } else {
      console.error(`Error: ${e.message}`);
    }
    return 1;
  }
}
