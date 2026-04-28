/**
 * Parse gap items from DEVELOPMENT-REVIEW.md and refactor items from
 * REFACTOR-PLAN-*.md files. Extracted from `getStatus.ts` for reuse in
 * the cache indexer.
 */

export type GapSeverity = 'critical' | 'major' | 'minor' | 'nice';
export type RefactorPriority = 'p0' | 'p1' | 'p2';

export interface GapItem {
  severity: GapSeverity;
  text: string;
  resolved: boolean;
  lineNumber: number;
}

export interface RefactorItem {
  priority: RefactorPriority;
  text: string;
  resolved: boolean;
  lineNumber: number;
}

export function parseGapItems(content: string): GapItem[] {
  const lines = content.split('\n');
  const items: GapItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const severity = extractSeverity(line);
    if (!severity) continue;

    items.push({
      severity,
      text: line.trim(),
      resolved: isResolved(line),
      lineNumber: i + 1,
    });
  }

  return items;
}

export function parseRefactorItems(content: string): RefactorItem[] {
  const lines = content.split('\n');
  const items: RefactorItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const priority = extractPriority(line);
    if (!priority) continue;

    items.push({
      priority,
      text: line.trim(),
      resolved: isResolved(line),
      lineNumber: i + 1,
    });
  }

  return items;
}

function extractSeverity(line: string): GapSeverity | null {
  const trimmed = line.trim();
  if (trimmed.match(/^[-*]\s*\*?\*?Critical/i) || trimmed.match(/^[-*]\s*Critical/i)) {
    return 'critical';
  }
  if (trimmed.match(/^[-*]\s*\*?\*?Major/i) || trimmed.match(/^[-*]\s*Major/i)) {
    return 'major';
  }
  if (trimmed.match(/^[-*]\s*\*?\*?Minor/i) || trimmed.match(/^[-*]\s*Minor/i)) {
    return 'minor';
  }
  if (trimmed.match(/^[-*]\s*\*?\*?Nice[-\s]to[-\s]have/i) || trimmed.match(/^[-*]\s*Nice/i)) {
    return 'nice';
  }
  return null;
}

function extractPriority(line: string): RefactorPriority | null {
  const trimmed = line.trim();
  if (trimmed.match(/^[-*]\s*\*?\*?P0/i) || trimmed.match(/^[-*]\s*P0/i)) {
    return 'p0';
  }
  if (trimmed.match(/^[-*]\s*\*?\*?P1/i) || trimmed.match(/^[-*]\s*P1/i)) {
    return 'p1';
  }
  if (trimmed.match(/^[-*]\s*\*?\*?P2/i) || trimmed.match(/^[-*]\s*P2/i)) {
    return 'p2';
  }
  return null;
}

function isResolved(line: string): boolean {
  return /\[x\]/i.test(line) || /\bResolved\b/i.test(line);
}
