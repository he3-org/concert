import { describe, it, expect } from 'vitest';
import { TOOLS, findTool } from '../../mcp/registry.js';

describe('MCP registry', () => {
  it('exports all tools', () => {
    expect(TOOLS.length).toBeGreaterThan(0);
    const names = TOOLS.map((t) => t.name);
    expect(names).toContain('concert.get_status');
    expect(names).toContain('concert.get_state');
    expect(names).toContain('concert.list_missions');
    expect(names).toContain('concert.get_section');
    expect(names).toContain('concert.list_modified_sections');
  });

  it('findTool locates tools by name', () => {
    const tool = findTool('concert.get_status');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('concert.get_status');
  });

  it('findTool returns undefined for unknown tool', () => {
    expect(findTool('concert.nonexistent')).toBeUndefined();
  });

  it('tool names are unique', () => {
    const names = TOOLS.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('all tools have required properties', () => {
    for (const tool of TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.outputSchema).toBeDefined();
      expect(typeof tool.handler).toBe('function');
    }
  });
});
