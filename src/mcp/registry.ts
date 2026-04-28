import * as getState from './tools/getState.js';
import * as getStatus from './tools/getStatus.js';
import * as getSummary from './tools/getSummary.js';
import * as listMissions from './tools/listMissions.js';
import * as getSection from './tools/getSection.js';
import * as listModifiedSections from './tools/listModifiedSections.js';
import * as markSectionModified from './tools/markSectionModified.js';
import * as clearSectionModified from './tools/clearSectionModified.js';
import * as replaceSection from './tools/replaceSection.js';
import * as appendTelemetry from './tools/appendTelemetry.js';
import * as appendHistory from './tools/appendHistory.js';
import * as alignmentCheck from './tools/alignmentCheck.js';
import * as listTasks from './tools/listTasks.js';
import * as getTask from './tools/getTask.js';
import * as setTaskAcceptance from './tools/setTaskAcceptance.js';
import * as renderPlan from './tools/renderPlan.js';

export interface ToolContext {
  cwd: string;
}

export interface ToolDefinition<I = unknown, O = unknown> {
  name: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
  handler(args: I, ctx: ToolContext): Promise<O>;
}

export const TOOLS: ToolDefinition<unknown, unknown>[] = [
  getState,
  getStatus,
  getSummary,
  listMissions,
  getSection,
  listModifiedSections,
  markSectionModified,
  clearSectionModified,
  replaceSection,
  appendTelemetry,
  appendHistory,
  alignmentCheck,
  listTasks,
  getTask,
  setTaskAcceptance,
  renderPlan,
];

export function findTool(name: string): ToolDefinition<unknown, unknown> | undefined {
  return TOOLS.find((t) => t.name === name);
}
