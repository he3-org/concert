import { describe, it, expect } from 'vitest';
import { parseAcceptance, setAcceptance } from '../../lib/section-edit.js';

describe('parseAcceptance', () => {
  it('parses acceptance items', () => {
    const md = `# Task

## Acceptance Criteria

- [ ] First item
- [x] Second item
- [ ] Third item

## Notes`;
    const items = parseAcceptance(md);
    expect(items).toEqual([
      { index: 0, text: 'First item', done: false, lineOffset: 4 },
      { index: 1, text: 'Second item', done: true, lineOffset: 5 },
      { index: 2, text: 'Third item', done: false, lineOffset: 6 },
    ]);
  });

  it('returns empty array when no acceptance section', () => {
    const md = `# Task\n\n## Description\n\nNo acceptance here`;
    const items = parseAcceptance(md);
    expect(items).toEqual([]);
  });

  it('handles uppercase X', () => {
    const md = `## Acceptance Criteria\n\n- [X] Done`;
    const items = parseAcceptance(md);
    expect(items[0]?.done).toBe(true);
  });
});

describe('setAcceptance', () => {
  it('flips acceptance by index', () => {
    const md = `## Acceptance Criteria

- [ ] First
- [ ] Second`;
    const updated = setAcceptance(md, { index: 1 }, true);
    expect(updated).toContain('- [x] Second');
  });

  it('flips acceptance by text', () => {
    const md = `## Acceptance Criteria

- [ ] Build the feature
- [ ] Write tests`;
    const updated = setAcceptance(md, { text: 'feature' }, true);
    expect(updated).toContain('- [x] Build the feature');
    expect(updated).toContain('- [ ] Write tests');
  });

  it('throws on ambiguous text', () => {
    const md = `## Acceptance Criteria

- [ ] Test one
- [ ] Test two`;
    expect(() => setAcceptance(md, { text: 'Test' }, true)).toThrow('ambiguous');
  });

  it('throws on no match by index', () => {
    const md = `## Acceptance Criteria

- [ ] One`;
    expect(() => setAcceptance(md, { index: 5 }, true)).toThrow('no matching');
  });

  it('throws on no match by text', () => {
    const md = `## Acceptance Criteria

- [ ] One`;
    expect(() => setAcceptance(md, { text: 'missing' }, true)).toThrow('no matching');
  });

  it('round-trip flip preserves structure', () => {
    const md = `## Acceptance Criteria

- [ ] Item A
- [x] Item B`;
    const step1 = setAcceptance(md, { index: 0 }, true);
    const step2 = setAcceptance(step1, { index: 0 }, false);
    expect(step2).toContain('- [ ] Item A');
  });
});
