import * as getTask from '../mcp/tools/getTask.js';

export async function runGetTask(cwd: string, args: string[]): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert get-task <task> [--mission <slug>] [--json]

Get full details of a specific task file.

Arguments:
  <task>            Task slug

Options:
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

  try {
    const result = await getTask.handler({ task: taskArg, mission }, { cwd });

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (!result.found) {
        console.log(`Task not found: ${taskArg}`);
      } else {
        console.log(`Task: ${result.task}`);
        console.log(`Title: ${result.title}`);
        console.log(
          `Phase: ${result.phase ?? '-'}, Wave: ${result.wave}, Model: ${result.model ?? '-'}`
        );
        console.log(`Depends on: ${result.dependsOn?.join(', ') ?? '-'}`);
        console.log(`File: ${result.filePath}`);
        console.log(`\nAcceptance criteria (${result.acceptance?.length ?? 0}):`);
        if (result.acceptance) {
          for (const ac of result.acceptance) {
            const mark = ac.done ? 'x' : ' ';
            console.log(`  [${mark}] ${ac.text}`);
          }
        }
        if (result.body?.description) {
          console.log(`\nDescription:\n${result.body.description}`);
        }
      }
    }

    return 0;
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
