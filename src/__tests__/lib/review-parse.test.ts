import { describe, it, expect } from 'vitest';
import { parseGapItems, parseRefactorItems } from '../../lib/review-parse.js';

describe('parseGapItems', () => {
  it('extracts Critical items', () => {
    const content = `
- Critical: Missing error handling
- **Critical**: Another issue
* Critical something else
`;
    const items = parseGapItems(content);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.severity === 'critical')).toBe(true);
  });

  it('extracts Major items', () => {
    const content = `
- Major: Performance bottleneck
- **Major**: Code duplication
`;
    const items = parseGapItems(content);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.severity === 'major')).toBe(true);
  });

  it('extracts Minor items', () => {
    const content = `
- Minor: Typo in comment
* **Minor**: Formatting inconsistency
`;
    const items = parseGapItems(content);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.severity === 'minor')).toBe(true);
  });

  it('extracts Nice-to-have items', () => {
    const content = `
- Nice-to-have: Add more tests
- Nice: Better logging
`;
    const items = parseGapItems(content);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.severity === 'nice')).toBe(true);
  });

  it('marks resolved items with [x]', () => {
    const content = `
- Critical: Something [x]
- Major: Not done
`;
    const items = parseGapItems(content);
    expect(items[0].resolved).toBe(true);
    expect(items[1].resolved).toBe(false);
  });

  it('marks resolved items with "Resolved"', () => {
    const content = `
- Critical: Fixed issue Resolved
- Major: Still pending
`;
    const items = parseGapItems(content);
    expect(items[0].resolved).toBe(true);
    expect(items[1].resolved).toBe(false);
  });

  it('captures line numbers correctly', () => {
    const content = `Line 1
Line 2
- Critical: Issue on line 3
Line 4
- Major: Issue on line 5`;
    const items = parseGapItems(content);
    expect(items[0].lineNumber).toBe(3);
    expect(items[1].lineNumber).toBe(5);
  });

  it('returns empty array for empty content', () => {
    const items = parseGapItems('');
    expect(items).toEqual([]);
  });

  it('returns empty array for unrecognisable content', () => {
    const content = `
Some text
More text
Nothing relevant
`;
    const items = parseGapItems(content);
    expect(items).toEqual([]);
  });

  it('captures full line as text', () => {
    const content = '- Critical: This is the full text of the item';
    const items = parseGapItems(content);
    expect(items[0].text).toBe('- Critical: This is the full text of the item');
  });
});

describe('parseRefactorItems', () => {
  it('extracts P0 items', () => {
    const content = `
- P0: Urgent refactor
- **P0**: Another urgent
* P0 something else
`;
    const items = parseRefactorItems(content);
    expect(items).toHaveLength(3);
    expect(items.every((i) => i.priority === 'p0')).toBe(true);
  });

  it('extracts P1 items', () => {
    const content = `
- P1: High priority
- **P1**: Another high
`;
    const items = parseRefactorItems(content);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.priority === 'p1')).toBe(true);
  });

  it('extracts P2 items', () => {
    const content = `
- P2: Medium priority
* **P2**: Another medium
`;
    const items = parseRefactorItems(content);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.priority === 'p2')).toBe(true);
  });

  it('marks resolved items with [x]', () => {
    const content = `
- P0: Done [x]
- P1: Not done
`;
    const items = parseRefactorItems(content);
    expect(items[0].resolved).toBe(true);
    expect(items[1].resolved).toBe(false);
  });

  it('marks resolved items with "Resolved"', () => {
    const content = `
- P0: Fixed Resolved
- P1: Pending
`;
    const items = parseRefactorItems(content);
    expect(items[0].resolved).toBe(true);
    expect(items[1].resolved).toBe(false);
  });

  it('captures line numbers correctly', () => {
    const content = `Line 1
Line 2
- P0: Issue on line 3
Line 4
- P1: Issue on line 5`;
    const items = parseRefactorItems(content);
    expect(items[0].lineNumber).toBe(3);
    expect(items[1].lineNumber).toBe(5);
  });

  it('returns empty array for empty content', () => {
    const items = parseRefactorItems('');
    expect(items).toEqual([]);
  });

  it('returns empty array for unrecognisable content', () => {
    const content = `
Some text
More text
Nothing relevant
`;
    const items = parseRefactorItems(content);
    expect(items).toEqual([]);
  });

  it('captures full line as text', () => {
    const content = '- P0: This is the full text of the item';
    const items = parseRefactorItems(content);
    expect(items[0].text).toBe('- P0: This is the full text of the item');
  });
});
