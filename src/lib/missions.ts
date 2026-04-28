import * as fs from 'node:fs';
import * as path from 'node:path';
import { readState } from './state.js';

export interface MissionSummary {
  slug: string;
  path: string;
  stage: string | null;
  lastTouchedIso: string | null;
  isActive: boolean;
}

/**
 * List all missions in .concert/missions/.
 */
export function listMissions(cwd: string): MissionSummary[] {
  const missionsDir = path.join(cwd, '.concert', 'missions');
  if (!fs.existsSync(missionsDir)) {
    return [];
  }

  const activePath = resolveActiveMissionPath(cwd);
  const entries = fs.readdirSync(missionsDir, { withFileTypes: true });
  const missions: MissionSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const missionPath = path.join(missionsDir, entry.name);
    const stageFile = path.join(missionPath, 'stage.txt');
    const stage = fs.existsSync(stageFile) ? fs.readFileSync(stageFile, 'utf-8').trim() : null;

    const lastTouchedIso = getLastTouched(missionPath);
    const isActive = activePath === missionPath;

    missions.push({
      slug: entry.name,
      path: missionPath,
      stage,
      lastTouchedIso,
      isActive,
    });
  }

  return missions;
}

/**
 * Resolve the active mission path from state.json.
 */
export function resolveActiveMissionPath(cwd: string): string | null {
  const state = readState(cwd);
  if (!state || !state.mission_path) {
    return null;
  }
  return path.resolve(cwd, state.mission_path);
}

/**
 * Get the last modified time of files directly in the mission directory.
 */
function getLastTouched(missionPath: string): string | null {
  try {
    const entries = fs.readdirSync(missionPath, { withFileTypes: true });
    let maxMtime = 0;

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(missionPath, entry.name);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs > maxMtime) {
          maxMtime = stat.mtimeMs;
        }
      }
    }

    return maxMtime > 0 ? new Date(maxMtime).toISOString() : null;
  } catch {
    return null;
  }
}
