import * as renderPlan from '../mcp/tools/renderPlan.js';

export async function runRenderPlan(cwd: string, args: string[]): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert render-plan [--mission <slug>] [--json]

Render per-phase task tables into PLAN.md.

Options:
  --mission <slug>  Mission slug (default: active mission)
  --json            Output as JSON
  --help            Show this help`);
    return 0;
  }

  const isJson = args.includes('--json');
  const mission = args.includes('--mission') ? args[args.indexOf('--mission') + 1] : undefined;

  try {
    const result = await renderPlan.handler({ mission }, { cwd });

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (!result.ok) {
        console.log(`Failed: ${result.error}`);
      } else {
        console.log(`Rendered PLAN.md: ${result.missionPlanPath}`);
        console.log(`  Tasks: ${result.tasksRendered}, Phases: ${result.phasesRendered}`);
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
