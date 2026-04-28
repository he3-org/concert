import { describe, it, expect } from 'vitest';
import {
  slugify,
  parseSections,
  getSection,
  findModifiedMarkers,
} from '../../lib/markdown-section.js';

describe('slugify', () => {
  it('converts heading to GitHub-style slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('API Design & Patterns')).toBe('api-design-patterns');
    expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
    expect(slugify('  Leading and trailing  ')).toBe('leading-and-trailing');
  });

  it('handles special characters', () => {
    expect(slugify('Section #1: Overview')).toBe('section-1-overview');
    expect(slugify("What's Next?")).toBe('whats-next');
  });

  it('handles empty and whitespace-only strings', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});

describe('parseSections', () => {
  it('parses multiple H2 sections', () => {
    const md = `# Main
## First Section
Content of first section.
## Second Section
Content of second section.
More content.`;

    const sections = parseSections(md);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.slug).toBe('first-section');
    expect(sections[0]?.heading).toBe('First Section');
    expect(sections[0]?.body).toBe('Content of first section.');
    expect(sections[1]?.slug).toBe('second-section');
    expect(sections[1]?.body).toBe('Content of second section.\nMore content.');
  });

  it('ignores H1 and H3+ headings', () => {
    const md = `# Main Title
## Section
Content here.
### Subsection
More content.
## Another Section
Final content.`;

    const sections = parseSections(md);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.slug).toBe('section');
    expect(sections[1]?.slug).toBe('another-section');
  });

  it('returns empty array when no H2 sections', () => {
    const md = `# Title\n### Subsection\nNo H2 here.`;
    expect(parseSections(md)).toEqual([]);
  });

  it('detects modified markers in section bodies', () => {
    const md = `## Modified Section
Content here.
<!-- CONCERT:MODIFIED -->
## Clean Section
Nothing here.`;

    const sections = parseSections(md);
    expect(sections[0]?.modifiedMarker).toBe(true);
    expect(sections[1]?.modifiedMarker).toBe(false);
  });

  it('extracts modified slug from CONCERT:MODIFIED:<slug>', () => {
    const md = `## Example
<!-- CONCERT:MODIFIED:example -->
Body text.`;

    const sections = parseSections(md);
    expect(sections[0]?.modifiedSlug).toBe('example');
  });
});

describe('getSection', () => {
  const md = `## First
Body of first.
## Second
Body of second.`;

  it('finds section by slug (case-insensitive)', () => {
    const section = getSection(md, 'first');
    expect(section).not.toBeNull();
    expect(section?.heading).toBe('First');

    const section2 = getSection(md, 'SECOND');
    expect(section2).not.toBeNull();
    expect(section2?.heading).toBe('Second');
  });

  it('returns null for missing section', () => {
    expect(getSection(md, 'nonexistent')).toBeNull();
  });
});

describe('findModifiedMarkers', () => {
  it('detects whole-doc marker', () => {
    const md = `# Doc\n<!-- CONCERT:MODIFIED -->\nContent.`;
    const markers = findModifiedMarkers(md);
    expect(markers.wholeDoc).toBe(true);
    expect(markers.sectionSlugs).toEqual([]);
  });

  it('detects per-section markers', () => {
    const md = `## Section One
<!-- CONCERT:MODIFIED:section-one -->
## Section Two
<!-- CONCERT:MODIFIED:section-two -->`;
    const markers = findModifiedMarkers(md);
    expect(markers.wholeDoc).toBe(false);
    expect(markers.sectionSlugs).toEqual(['section-one', 'section-two']);
  });

  it('detects both whole-doc and per-section markers', () => {
    const md = `<!-- CONCERT:MODIFIED -->
## Section
<!-- CONCERT:MODIFIED:section -->`;
    const markers = findModifiedMarkers(md);
    expect(markers.wholeDoc).toBe(true);
    expect(markers.sectionSlugs).toEqual(['section']);
  });

  it('returns empty when no markers', () => {
    const md = `## Clean\nNo markers here.`;
    const markers = findModifiedMarkers(md);
    expect(markers.wholeDoc).toBe(false);
    expect(markers.sectionSlugs).toEqual([]);
  });

  it('deduplicates multiple identical section markers', () => {
    const md = `<!-- CONCERT:MODIFIED:section -->
<!-- CONCERT:MODIFIED:section -->`;
    const markers = findModifiedMarkers(md);
    expect(markers.sectionSlugs).toEqual(['section']);
  });
});
