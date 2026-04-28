import * as listTasks from '../mcp/tools/listTasks.js';

export async function runListTasks(cwd: string, args: string[]): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert list-tasks [--mission <slug>] [--phase <phase>] [--wave <n>] [--model <tier>] [--status <status>] [--json]

List task files with optional filters.

Options:
  --mission <slug>  Mission slug (default: active mission)
  --phase <phase>   Filter by phase
  --wave <n>        Filter by wave number
  --model <tier>    Filter by model (haiku, sonnet, opus)
  --status <status> Filter by status (pending, in-progress, done)
  --json            Output as JSON
  --help            Show this help`);
    return 0;
  }

  const isJson = args.includes('--json');
  const mission = args.includes('--mission') ? args[args.indexOf('--mission') + 1] : undefined;
  const phase = args.includes('--phase') ? args[args.indexOf('--phase') + 1] : undefined;
  const wave = args.includes('--wave')
    ? parseInt(args[args.indexOf('--wave') + 1]!, 10)
    : undefined;
  const model = args.includes('--model')
    ? (args[args.indexOf('--model') + 1] as 'haiku' | 'sonnet' | 'opus' | undefined)
    : undefined;
  const status = args.includes('--status')
    ? (args[args.indexOf('--status') + 1] as 'pending' | 'in-progress' | 'done' | undefined)
    : undefined;

  try {
    const result = await listTasks.handler({ mission, phase, wave, model, status }, { cwd });

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.tasks.length === 0) {
        console.log('No tasks found.');
      } else {
        console.log(`Found ${result.tasks.length} task(s):\n`);
        for (const task of result.tasks) {
          console.log(`  ${task.task} (${task.status})`);
          console.log(
            `    Phase: ${task.phase ?? '-'}, Wave: ${task.wave}, Model: ${task.model ?? '-'}`
          );
          console.log(`    Acceptance: ${task.completedAcceptance}/${task.totalAcceptance}`);
          console.log(`    File: ${task.filePath}`);
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
