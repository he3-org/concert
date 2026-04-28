import { describe, it, expect } from 'vitest';
import { parseTaskFrontmatter } from '../../lib/task-frontmatter.js';

describe('parseTaskFrontmatter', () => {
  it('parses minimal frontmatter', () => {
    const md = `---
task: foo
title: Foo Task
---
Body here`;
    const result = parseTaskFrontmatter(md);
    expect(result.frontmatter).toEqual({
      task: 'foo',
      title: 'Foo Task',
      depends_on: [],
      wave: 0,
    });
    expect(result.body).toBe('Body here');
    expect(result.bodyOffset).toBe(4);
    expect(result.errors).toEqual([]);
  });

  it('parses full frontmatter with arrays and phase', () => {
    const md = `---
task: bar
title: 'Bar Task'
phase: '01-foundation'
depends_on: ['foo', 'baz']
wave: 2
model: sonnet
---
Body`;
    const result = parseTaskFrontmatter(md);
    expect(result.frontmatter).toEqual({
      task: 'bar',
      title: 'Bar Task',
      phase: '01-foundation',
      depends_on: ['foo', 'baz'],
      wave: 2,
      model: 'sonnet',
    });
    expect(result.errors).toEqual([]);
  });

  it('handles empty depends_on array', () => {
    const md = `---
task: qux
title: Qux
depends_on: []
---`;
    const result = parseTaskFrontmatter(md);
    expect(result.frontmatter?.depends_on).toEqual([]);
  });

  it('handles missing closing marker', () => {
    const md = `---
task: bad
title: Bad`;
    const result = parseTaskFrontmatter(md);
    expect(result.frontmatter).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles no frontmatter', () => {
    const md = `# Just a heading\nNo frontmatter here`;
    const result = parseTaskFrontmatter(md);
    expect(result.frontmatter).toBeNull();
    expect(result.body).toBe(md);
    expect(result.bodyOffset).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('preserves unknown keys in extras', () => {
    const md = `---
task: extra
title: Extra Task
custom_field: value
---`;
    const result = parseTaskFrontmatter(md);
    expect(result.frontmatter?.extras).toEqual({ custom_field: 'value' });
  });

  it('handles invalid model value in extras', () => {
    const md = `---
task: bad-model
title: Bad Model
model: invalid
---`;
    const result = parseTaskFrontmatter(md);
    expect(result.frontmatter?.model).toBeUndefined();
    expect(result.frontmatter?.extras).toEqual({ model: 'invalid' });
  });
});
