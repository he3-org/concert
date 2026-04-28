import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { listMissions, resolveActiveMissionPath } from '../../lib/missions.js';
import { writeState } from '../../lib/state.js';
import type { ConcertState } from '../../types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concert-missions-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('listMissions', () => {
  it('returns empty array when no missions directory', () => {
    expect(listMissions(tmpDir)).toEqual([]);
  });

  it('lists single mission', () => {
    const missionsDir = path.join(tmpDir, '.concert', 'missions');
    const missionDir = path.join(missionsDir, 'test-mission');
    fs.mkdirSync(missionDir, { recursive: true });
    fs.writeFileSync(path.join(missionDir, 'VISION.md'), '# Vision\n');

    const missions = listMissions(tmpDir);
    expect(missions).toHaveLength(1);
    expect(missions[0]?.slug).toBe('test-mission');
    expect(missions[0]?.isActive).toBe(false);
    expect(missions[0]?.stage).toBeNull();
    expect(missions[0]?.lastTouchedIso).not.toBeNull();
  });

  it('reads stage from stage.txt', () => {
    const missionsDir = path.join(tmpDir, '.concert', 'missions');
    const missionDir = path.join(missionsDir, 'with-stage');
    fs.mkdirSync(missionDir, { recursive: true });
    fs.writeFileSync(path.join(missionDir, 'stage.txt'), 'execution');

    const missions = listMissions(tmpDir);
    expect(missions[0]?.stage).toBe('execution');
  });

  it('marks active mission from state.json', () => {
    const missionsDir = path.join(tmpDir, '.concert', 'missions');
    const missionDir = path.join(missionsDir, 'active-mission');
    fs.mkdirSync(missionDir, { recursive: true });

    const state: Partial<ConcertState> = {
      mission: 'active-mission',
      mission_path: '.concert/missions/active-mission',
    };
    writeState(tmpDir, state as ConcertState);

    const missions = listMissions(tmpDir);
    expect(missions[0]?.isActive).toBe(true);
  });

  it('lists multiple missions', () => {
    const missionsDir = path.join(tmpDir, '.concert', 'missions');
    fs.mkdirSync(path.join(missionsDir, 'mission-a'), { recursive: true });
    fs.mkdirSync(path.join(missionsDir, 'mission-b'), { recursive: true });

    const missions = listMissions(tmpDir);
    expect(missions).toHaveLength(2);
    const slugs = missions.map((m) => m.slug).sort();
    expect(slugs).toEqual(['mission-a', 'mission-b']);
  });

  it('computes lastTouchedIso from file mtimes', () => {
    const missionsDir = path.join(tmpDir, '.concert', 'missions');
    const missionDir = path.join(missionsDir, 'test');
    fs.mkdirSync(missionDir, { recursive: true });

    const file1 = path.join(missionDir, 'file1.md');
    const file2 = path.join(missionDir, 'file2.md');
    fs.writeFileSync(file1, 'content');

    // Wait a bit to ensure different mtimes
    const now = new Date();
    fs.writeFileSync(file2, 'newer');
    fs.utimesSync(file2, now, now);

    const missions = listMissions(tmpDir);
    expect(missions[0]?.lastTouchedIso).toBeTruthy();
    // Should be ISO-8601 format
    expect(missions[0]?.lastTouchedIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('resolveActiveMissionPath', () => {
  it('returns null when state.json missing', () => {
    expect(resolveActiveMissionPath(tmpDir)).toBeNull();
  });

  it('returns null when mission_path is empty', () => {
    const state: Partial<ConcertState> = {
      mission: '',
      mission_path: '',
    };
    writeState(tmpDir, state as ConcertState);
    expect(resolveActiveMissionPath(tmpDir)).toBeNull();
  });

  it('returns resolved path from state.json', () => {
    const state: Partial<ConcertState> = {
      mission: 'test',
      mission_path: '.concert/missions/test',
    };
    writeState(tmpDir, state as ConcertState);

    const result = resolveActiveMissionPath(tmpDir);
    expect(result).toBe(path.join(tmpDir, '.concert', 'missions', 'test'));
  });
});
