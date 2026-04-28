import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { parseSections, findModifiedMarkers } from '../lib/markdown-section.js';
import { parseAcceptance } from '../lib/section-edit.js';
import { parseTaskFrontmatter } from '../lib/task-frontmatter.js';
import { listMissions } from '../lib/missions.js';

export interface IndexResult {
  missionSlug: string;
  documentsIndexed: number;
  sectionsIndexed: number;
  markersFound: number;
  tasksIndexed: number;
}

export function indexMission(
  db: {
    exec(sql: string): void;
    prepare(sql: string): {
      run(...args: unknown[]): unknown;
      all(...args: unknown[]): unknown[];
    };
  },
  cwd: string,
  missionSlug: string,
  missionPath: string
): IndexResult {
  const now = new Date().toISOString();
  let documentsIndexed = 0;
  let sectionsIndexed = 0;
  let markersFound = 0;
  let tasksIndexed = 0;

  const stageFile = path.join(missionPath, 'stage.txt');
  const stage = fs.existsSync(stageFile) ? fs.readFileSync(stageFile, 'utf-8').trim() : null;

  const entries = fs.existsSync(missionPath)
    ? fs.readdirSync(missionPath, { withFileTypes: true })
    : [];
  const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));

  db.prepare(
    'INSERT OR REPLACE INTO missions (slug, stage, branch, mission_path, last_indexed_at) VALUES (?, ?, ?, ?, ?)'
  ).run(missionSlug, stage, null, path.relative(cwd, missionPath), now);

  db.prepare('DELETE FROM documents WHERE mission_slug = ?').run(missionSlug);
  db.prepare('DELETE FROM sections WHERE mission_slug = ?').run(missionSlug);
  db.prepare('DELETE FROM modified_markers WHERE mission_slug = ?').run(missionSlug);
  db.prepare('DELETE FROM tasks WHERE mission_slug = ?').run(missionSlug);

  for (const file of mdFiles) {
    const filePath = path.join(missionPath, file.name);
    const content = fs.readFileSync(filePath, 'utf-8');
    const stat = fs.statSync(filePath);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    const docKind = path.basename(file.name, '.md').toUpperCase();
    const relativePath = file.name;

    db.prepare(
      'INSERT INTO documents (mission_slug, doc_kind, path, mtime_ms, sha256, indexed_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(missionSlug, docKind, relativePath, stat.mtimeMs, sha256, now);
    documentsIndexed++;

    const sections = parseSections(content);
    for (const section of sections) {
      db.prepare(
        'INSERT INTO sections (mission_slug, doc_kind, doc_path, slug, heading, body_offset, body_length, modified_marker, mtime_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        missionSlug,
        docKind,
        relativePath,
        section.slug,
        section.heading,
        section.bodyOffset,
        section.bodyLength,
        section.modifiedMarker ? 1 : 0,
        stat.mtimeMs
      );
      sectionsIndexed++;
    }

    const markers = findModifiedMarkers(content);
    if (markers.wholeDoc) {
      db.prepare(
        'INSERT INTO modified_markers (mission_slug, doc_path, section_slug, marked_at, source_section) VALUES (?, ?, ?, ?, ?)'
      ).run(missionSlug, relativePath, '*', now, null);
      markersFound++;
    }
    for (const sectionSlug of markers.sectionSlugs) {
      db.prepare(
        'INSERT INTO modified_markers (mission_slug, doc_path, section_slug, marked_at, source_section) VALUES (?, ?, ?, ?, ?)'
      ).run(missionSlug, relativePath, sectionSlug, now, null);
      markersFound++;
    }
  }

  const phasesDir = path.join(missionPath, 'phases');
  if (fs.existsSync(phasesDir) && fs.statSync(phasesDir).isDirectory()) {
    const phaseEntries = fs.readdirSync(phasesDir, { withFileTypes: true });
    for (const phaseEntry of phaseEntries) {
      if (!phaseEntry.isDirectory()) continue;
      const phasePath = path.join(phasesDir, phaseEntry.name);
      const taskFiles = fs
        .readdirSync(phasePath, { withFileTypes: true })
        .filter((e) => e.isFile() && /^TASK-.*\.md$/.test(e.name));

      for (const taskFile of taskFiles) {
        const taskFilePath = path.join(phasePath, taskFile.name);
        let content: string;
        let stat: fs.Stats;
        try {
          content = fs.readFileSync(taskFilePath, 'utf-8');
          stat = fs.statSync(taskFilePath);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Warning: failed to read task file ${taskFilePath}: ${msg}`);
          continue;
        }

        const parsed = parseTaskFrontmatter(content);
        if (!parsed.frontmatter) {
          console.error(`Warning: skipping ${taskFilePath} (no valid frontmatter)`);
          continue;
        }

        const fm = parsed.frontmatter;
        const taskSlug = fm.task;
        const phase = fm.phase ?? phaseEntry.name;
        const title = fm.title;
        const wave = fm.wave;
        const model = fm.model ?? null;
        const dependsOn = JSON.stringify(fm.depends_on);

        const acceptance = parseAcceptance(content);
        const totalAcceptance = acceptance.length;
        const completedAcceptance = acceptance.filter((a) => a.done).length;

        const sha256 = crypto.createHash('sha256').update(content).digest('hex');
        const relativeFilePath = path.relative(missionPath, taskFilePath);

        db.prepare(
          'INSERT OR REPLACE INTO tasks (mission_slug, task_slug, phase, title, wave, model, depends_on, file_path, total_acceptance, completed_acceptance, mtime_ms, sha256, indexed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          missionSlug,
          taskSlug,
          phase,
          title,
          wave,
          model,
          dependsOn,
          relativeFilePath,
          totalAcceptance,
          completedAcceptance,
          stat.mtimeMs,
          sha256,
          now
        );
        tasksIndexed++;
      }
    }

    const existingTasks = db
      .prepare('SELECT file_path FROM tasks WHERE mission_slug = ?')
      .all(missionSlug) as { file_path: string }[];

    for (const row of existingTasks) {
      const absPath = path.join(missionPath, row.file_path);
      if (!fs.existsSync(absPath)) {
        db.prepare('DELETE FROM tasks WHERE mission_slug = ? AND file_path = ?').run(
          missionSlug,
          row.file_path
        );
      }
    }
  }

  return { missionSlug, documentsIndexed, sectionsIndexed, markersFound, tasksIndexed };
}

export function indexAll(
  db: {
    exec(sql: string): void;
    prepare(sql: string): {
      run(...args: unknown[]): unknown;
      all(...args: unknown[]): unknown[];
    };
  },
  cwd: string
): IndexResult[] {
  const missions = listMissions(cwd);
  const results: IndexResult[] = [];

  db.exec('BEGIN TRANSACTION');
  try {
    for (const mission of missions) {
      const result = indexMission(db, cwd, mission.slug, mission.path);
      results.push(result);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return results;
}
