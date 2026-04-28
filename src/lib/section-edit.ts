import { parseSections } from './markdown-section.js';

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

  const markerPattern = new RegExp(`^\\s*<!--\\s*CONCERT:MODIFIED:${sectionSlug}`, 'i');
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

  const markerPattern = new RegExp(`^\\s*<!--\\s*CONCERT:MODIFIED:${sectionSlug}`, 'i');
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
