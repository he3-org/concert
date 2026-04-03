import { describe, it, expect } from 'vitest';
import { mergeState, mergeConfig } from '../lib/merge.js';

describe('mergeState', () => {
  it('adds new fields from template to current', () => {
    const current = { name: 'test', existing: 'value' };
    const template = { name: 'default', existing: 'default', new_field: 'default_value' };
    const { merged, report } = mergeState(current, template);
    expect(merged.new_field).toBe('default_value');
    expect(report.added).toContain('new_field');
  });

  it('preserves existing user values', () => {
    const current = { name: 'user-name', version: '1.0.0' };
    const template = { name: 'default-name', version: '0.1.0' };
    const { merged, report } = mergeState(current, template);
    expect(merged.name).toBe('user-name');
    expect(merged.version).toBe('1.0.0');
    expect(report.added).toHaveLength(0);
  });

  it('removes deprecated fields from current', () => {
    const current = { name: 'test', deprecated: 'old-value' };
    const template = { name: 'default' };
    const { merged, report } = mergeState(current, template);
    expect('deprecated' in merged).toBe(false);
    expect(report.removed).toContain('deprecated');
  });

  it('merges nested objects recursively', () => {
    const current = { execution: { mode: 'wave', old_field: 'old' } };
    const template = {
      execution: { mode: 'default', max_iterations: 3 },
    };
    const { merged, report } = mergeState(current, template);
    const execution = merged.execution as Record<string, unknown>;
    expect(execution.mode).toBe('wave'); // user value preserved
    expect(execution.max_iterations).toBe(3); // new field added
    expect('old_field' in execution).toBe(false); // deprecated removed
    expect(report.added).toContain('execution.max_iterations');
    expect(report.removed).toContain('execution.old_field');
  });

  it('preserves array fields as-is', () => {
    const current = { history: [{ action: 'test' }], tags: [] };
    const template = { history: [], tags: ['default'] };
    const { merged } = mergeState(current, template);
    expect(merged.history).toEqual([{ action: 'test' }]);
    expect(merged.tags).toEqual([]); // user's empty array preserved
  });

  it('produces warnings for type mismatches but preserves user value', () => {
    const current = { count: 'not-a-number' };
    const template = { count: 42 };
    const { merged, report } = mergeState(current, template);
    expect(merged.count).toBe('not-a-number'); // user value preserved
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.warnings[0]).toContain('count');
  });

  it('handles empty current object — gets all template fields', () => {
    const current = {};
    const template = { a: 1, b: 'hello', c: { nested: true } };
    const { merged, report } = mergeState(current, template);
    expect(merged.a).toBe(1);
    expect(merged.b).toBe('hello');
    expect(report.added).toContain('a');
    expect(report.added).toContain('b');
    expect(report.added).toContain('c');
  });

  it('handles deep nesting (3+ levels)', () => {
    const current = {
      level1: { level2: { level3: { existing: 'value' } } },
    };
    const template = {
      level1: { level2: { level3: { existing: 'default', new_deep: 'new' } } },
    };
    const { merged, report } = mergeState(current, template);
    const l3 = ((merged.level1 as Record<string, unknown>).level2 as Record<string, unknown>)
      .level3 as Record<string, unknown>;
    expect(l3.existing).toBe('value');
    expect(l3.new_deep).toBe('new');
    expect(report.added).toContain('level1.level2.level3.new_deep');
  });
});

describe('mergeConfig', () => {
  const templateConfig = {
    project_name: '',
    concert_version: '0.1.0',
    execution: {
      mode: 'wave',
      max_iterations: 3,
    },
  };

  it('preserves JSONC comments when adding fields', () => {
    const currentRaw = `{
  // User's project
  "project_name": "my-project",
  "concert_version": "0.1.0",
  "execution": {
    "mode": "wave"
  }
}`;
    const { mergedRaw, report } = mergeConfig(currentRaw, templateConfig);
    expect(mergedRaw).toContain("// User's project");
    expect(mergedRaw).toContain('max_iterations');
    expect(report.added).toContain('execution.max_iterations');
  });

  it('preserves JSONC comments when removing fields', () => {
    const currentRaw = `{
  // Comment preserved
  "project_name": "my-project",
  "concert_version": "0.1.0",
  "deprecated_field": "old",
  "execution": {
    "mode": "wave",
    "max_iterations": 3
  }
}`;
    const { mergedRaw, report } = mergeConfig(currentRaw, templateConfig);
    expect(mergedRaw).toContain('// Comment preserved');
    expect(mergedRaw).not.toContain('deprecated_field');
    expect(report.removed).toContain('deprecated_field');
  });

  it('preserves user values in JSONC', () => {
    const currentRaw = `{
  "project_name": "user-project",
  "concert_version": "0.1.0",
  "execution": {
    "mode": "wave",
    "max_iterations": 3
  }
}`;
    const { mergedRaw } = mergeConfig(currentRaw, templateConfig);
    expect(mergedRaw).toContain('user-project');
  });

  it('handles trailing commas in current config (JSONC style)', () => {
    const currentRaw = `{
  "project_name": "web-store",
  "concert_version": "0.1.0",
  "execution": {
    "mode": "wave",
    "max_iterations": 3,
  },
}`;
    expect(() => mergeConfig(currentRaw, templateConfig)).not.toThrow();
    const { mergedRaw } = mergeConfig(currentRaw, templateConfig);
    expect(mergedRaw).toContain('web-store');
  });

  it('report accurately lists all additions, removals, and warnings', () => {
    const currentRaw = `{
  "project_name": "test",
  "concert_version": "0.1.0",
  "old_field": "remove-me",
  "execution": {
    "mode": "wave"
  }
}`;
    const { report } = mergeConfig(currentRaw, templateConfig);
    expect(report.removed).toContain('old_field');
    expect(report.added).toContain('execution.max_iterations');
  });
});
