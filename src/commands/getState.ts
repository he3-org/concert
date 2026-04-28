import { handler, type GetStateInput } from '../mcp/tools/getState.js';

export async function runGetState(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionArg = args.indexOf('--mission');
  const mission = missionArg !== -1 ? args[missionArg + 1] : undefined;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert get-state [--mission <slug>] [--json]

Get current mission state from state.json.

Options:
  --mission <slug>  Target mission (default: active)
  --json            Output as JSON
  --help, -h        Show this help`);
    return 0;
  }

  const input: GetStateInput = mission ? { mission } : {};
  const output = await handler(input, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return 0;
  }

  // Human-readable output
  console.log(`Mission: ${output.mission || '—'}`);
  console.log(`Mission path: ${output.missionPath || '—'}`);
  console.log(`Stage: ${output.stage || '—'}`);
  console.log(`Branch: ${output.branch || '—'}`);
  console.log(`PR: ${output.prNumber || 0}`);
  console.log(`Status: ${output.statusDisplay || '—'}`);
  console.log(
    `Progress: ${output.phasesCompleted}/${output.phasesTotal} phases, ${output.tasksCompleted}/${output.tasksTotal} tasks`
  );
  console.log(`Commits: ${output.commits}`);
  console.log(`Next action: ${output.nextAction || '—'}`);
  console.log(`Blockers: ${output.blockers.length}`);
  console.log(`Recent failures: ${output.recentFailures.length}`);
  console.log(`Found: ${output.found}`);

  return 0;
}
