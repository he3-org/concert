import { handler, type GetStatusInput } from '../mcp/tools/getStatus.js';

export async function runGetStatus(cwd: string, args: string[]): Promise<number> {
  const isJson = args.includes('--json');
  const missionArg = args.indexOf('--mission');
  const mission = missionArg !== -1 ? args[missionArg + 1] : undefined;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert get-status [--mission <slug>] [--json]

Get comprehensive mission status snapshot.

Options:
  --mission <slug>  Target mission (default: active)
  --json            Output as JSON
  --help, -h        Show this help`);
    return 0;
  }

  const input: GetStatusInput = mission ? { mission } : {};
  const output = await handler(input, { cwd });

  if (isJson) {
    console.log(JSON.stringify(output, null, 2));
    return 0;
  }

  // Human-readable output
  console.log(`Mission: ${output.mission || '—'}`);
  console.log(`Stage: ${output.stage || '—'}`);
  console.log(`Branch: ${output.branch || '—'}`);
  console.log(`Found: ${output.found}`);
  console.log(`Modified docs: ${output.modifiedDocuments.length}`);
  if (output.developmentReviewGaps) {
    const { critical, major, minor, nice } = output.developmentReviewGaps;
    console.log(
      `Review gaps: Crit ${critical.open}/${critical.total}, Maj ${major.open}/${major.total}, Min ${minor.open}/${minor.total}, Nice ${nice.open}/${nice.total}`
    );
  } else {
    console.log(`Review gaps: —`);
  }
  if (output.refactorPlan) {
    const { p0, p1, p2 } = output.refactorPlan;
    console.log(
      `Refactor: P0 ${p0.open}/${p0.total}, P1 ${p1.open}/${p1.total}, P2 ${p2.open}/${p2.total}`
    );
  } else {
    console.log(`Refactor: —`);
  }
  console.log(`Recent failures: ${output.recentFailures.length}`);
  console.log(`Next action: ${output.nextRecommendedAction}`);

  return 0;
}
