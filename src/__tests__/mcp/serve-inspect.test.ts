import { describe, it, expect } from 'vitest';
import { inspectCatalogue } from '../../mcp/server.js';

describe('MCP server', () => {
  it('inspectCatalogue returns tool metadata without SDK', () => {
    const catalogue = inspectCatalogue();
    expect(catalogue.length).toBeGreaterThan(0);

    for (const item of catalogue) {
      expect(item.name).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.inputSchema).toBeDefined();
      expect(item.outputSchema).toBeDefined();
    }
  });

  it('catalogue includes all expected tools', () => {
    const catalogue = inspectCatalogue();
    const names = catalogue.map((t) => t.name);

    expect(names).toContain('concert.get_status');
    expect(names).toContain('concert.get_state');
    expect(names).toContain('concert.list_missions');
    expect(names).toContain('concert.get_section');
    expect(names).toContain('concert.list_modified_sections');
  });
});
