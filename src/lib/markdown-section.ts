export interface Section {
  slug: string;
  heading: string;
  level: 2;
  bodyOffset: number;
  bodyLength: number;
  body: string;
  modifiedMarker: boolean;
  modifiedSlug?: string;
}

export interface ModifiedMarkers {
  wholeDoc: boolean;
  sectionSlugs: string[];
}

/**
 * Convert heading text to GitHub-style slug.
 */
export function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse H2 sections from markdown.
 */
export function parseSections(md: string): Section[] {
  const lines = md.split('\n');
  const sections: Section[] = [];
  let currentSection: {
    slug: string;
    heading: string;
    startLine: number;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // H2 heading
    if (line.startsWith('## ')) {
      // Close previous section
      if (currentSection) {
        const bodyLines = lines.slice(currentSection.startLine + 1, i);
        const body = bodyLines.join('\n');
        sections.push({
          slug: currentSection.slug,
          heading: currentSection.heading,
          level: 2,
          bodyOffset: currentSection.startLine + 1,
          bodyLength: bodyLines.length,
          body,
          modifiedMarker: /CONCERT:MODIFIED/i.test(body),
          modifiedSlug: extractModifiedSlug(body),
        });
      }

      // Start new section
      const heading = line.slice(3).trim();
      currentSection = {
        slug: slugify(heading),
        heading,
        startLine: i,
      };
    }
  }

  // Close final section
  if (currentSection) {
    const bodyLines = lines.slice(currentSection.startLine + 1);
    const body = bodyLines.join('\n');
    sections.push({
      slug: currentSection.slug,
      heading: currentSection.heading,
      level: 2,
      bodyOffset: currentSection.startLine + 1,
      bodyLength: bodyLines.length,
      body,
      modifiedMarker: /CONCERT:MODIFIED/i.test(body),
      modifiedSlug: extractModifiedSlug(body),
    });
  }

  return sections;
}

/**
 * Get a section by slug (case-insensitive).
 */
export function getSection(md: string, slug: string): Section | null {
  const sections = parseSections(md);
  const targetSlug = slug.toLowerCase();
  return sections.find((s) => s.slug === targetSlug) ?? null;
}

/**
 * Find all CONCERT:MODIFIED markers in a document.
 */
export function findModifiedMarkers(md: string): ModifiedMarkers {
  const wholeDocPattern = /CONCERT:MODIFIED(?!:)/i;
  const sectionPattern = /CONCERT:MODIFIED:([a-z0-9-]+)/gi;

  const wholeDoc = wholeDocPattern.test(md);
  const sectionSlugs: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = sectionPattern.exec(md)) !== null) {
    const slug = match[1];
    if (slug && !sectionSlugs.includes(slug)) {
      sectionSlugs.push(slug);
    }
  }

  return { wholeDoc, sectionSlugs };
}

/**
 * Extract the slug from a CONCERT:MODIFIED:<slug> marker in body text.
 */
function extractModifiedSlug(body: string): string | undefined {
  const match = /CONCERT:MODIFIED:([a-z0-9-]+)/i.exec(body);
  return match?.[1];
}
