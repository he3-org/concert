import { parseSections } from './markdown-section.js';

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface AcceptanceItem {
  index: number;
  text: string;
  done: boolean;
  lineOffset: number;
}

export function parseAcceptance(md: string): AcceptanceItem[] {
  const sections = parseSections(md);
  const acceptanceSection = sections.find((s) => s.slug === 'acceptance-criteria');
  if (!acceptanceSection) return [];

  const lines = md.split('\n');
  const bodyStart = acceptanceSection.bodyOffset;
  const bodyEnd = bodyStart + acceptanceSection.bodyLength;

  const items: AcceptanceItem[] = [];
  const checkboxPattern = /^- \[([ xX])\] (.+)$/;

  for (let i = bodyStart; i < bodyEnd; i++) {
    const match = checkboxPattern.exec(lines[i]);
    if (match) {
      items.push({
        index: items.length,
        text: match[2]!,
        done: match[1]!.toLowerCase() === 'x',
        lineOffset: i,
      });
    }
  }

  return items;
}

export function setAcceptance(
  md: string,
  selector: { index?: number; text?: string },
  checked: boolean
): string {
  const items = parseAcceptance(md);
  if (items.length === 0) {
    throw new Error('no acceptance criteria section or items found');
  }

  let targetItem: AcceptanceItem | undefined;

  if (selector.index !== undefined) {
    targetItem = items.find((it) => it.index === selector.index);
    if (!targetItem) {
      throw new Error('no matching acceptance criterion');
    }
  } else if (selector.text) {
    const lowerText = selector.text.toLowerCase();
    const matches = items.filter((it) => it.text.toLowerCase().includes(lowerText));
    if (matches.length === 0) {
      throw new Error('no matching acceptance criterion');
    }
    if (matches.length > 1) {
      throw new Error('ambiguous acceptance criterion text');
    }
    targetItem = matches[0]!;
  } else {
    throw new Error('no matching acceptance criterion');
  }

  const lines = md.split('\n');
  const originalLine = lines[targetItem.lineOffset];
  const checkMark = checked ? 'x' : ' ';
  const updated = originalLine.replace(/^(- \[)[ xX](\])/, `$1${checkMark}$2`);
  lines[targetItem.lineOffset] = updated;

  return lines.join('\n');
}

export function insertOrRefreshMarker(md: string, sectionSlug: string, source?: string): string {
  const sections = parseSections(md);
  const target = sections.find((s) => s.slug === sectionSlug);
  if (!target) {
    throw new Error(`section not found: ${sectionSlug}`);
  }

  const lines = md.split('\n');
  const headingLine = target.bodyOffset - 1;
  const bodyStart = target.bodyOffset;
  const bodyEnd = bodyStart + target.bodyLength;

  const markerPattern = new RegExp(
    `^\\s*<!--\\s*CONCERT:MODIFIED:${escapeRegExp(sectionSlug)}`,
    'i'
  );
  let markerLineIndex = -1;
  for (let i = bodyStart; i < bodyEnd; i++) {
    if (markerPattern.test(lines[i])) {
      markerLineIndex = i;
      break;
    }
  }

  const markerText = source
    ? `<!-- CONCERT:MODIFIED:${sectionSlug} — source: ${source} -->`
    : `<!-- CONCERT:MODIFIED:${sectionSlug} -->`;

  if (markerLineIndex >= 0) {
    lines[markerLineIndex] = markerText;
  } else {
    lines.splice(headingLine + 1, 0, markerText);
  }

  return lines.join('\n');
}

export function removeMarker(md: string, sectionSlug: string): string {
  const sections = parseSections(md);
  const target = sections.find((s) => s.slug === sectionSlug);
  if (!target) {
    return md;
  }

  const lines = md.split('\n');
  const bodyStart = target.bodyOffset;
  const bodyEnd = bodyStart + target.bodyLength;

  const markerPattern = new RegExp(
    `^\\s*<!--\\s*CONCERT:MODIFIED:${escapeRegExp(sectionSlug)}`,
    'i'
  );
  const filtered = [];
  for (let i = 0; i < lines.length; i++) {
    if (i >= bodyStart && i < bodyEnd && markerPattern.test(lines[i])) {
      continue;
    }
    filtered.push(lines[i]);
  }

  return filtered.join('\n');
}

export function replaceSectionBody(md: string, sectionSlug: string, newBody: string): string {
  const sections = parseSections(md);
  const target = sections.find((s) => s.slug === sectionSlug);
  if (!target) {
    throw new Error(`section not found: ${sectionSlug}`);
  }

  const lines = md.split('\n');
  const headingLine = target.bodyOffset - 1;
  const bodyStart = target.bodyOffset;
  const bodyEnd = bodyStart + target.bodyLength;

  const before = lines.slice(0, headingLine + 1);
  const after = lines.slice(bodyEnd);

  const newBodyLines = newBody.split('\n');

  return [...before, ...newBodyLines, ...after].join('\n');
}
