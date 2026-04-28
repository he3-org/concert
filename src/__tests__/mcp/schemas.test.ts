import { describe, it, expect } from 'vitest';
import * as schemas from '../../mcp/schemas.js';
import { TOOLS } from '../../mcp/registry.js';

describe('MCP schemas', () => {
  it('all schemas have required JSON Schema fields', () => {
    const allSchemas = [
      schemas.getStateInputSchema,
      schemas.getStateOutputSchema,
      schemas.getStatusInputSchema,
      schemas.getStatusOutputSchema,
      schemas.listMissionsInputSchema,
      schemas.getSectionInputSchema,
      schemas.getSectionOutputSchema,
      schemas.listModifiedSectionsInputSchema,
      schemas.listModifiedSectionsOutputSchema,
    ];

    for (const schema of allSchemas) {
      expect(schema).toHaveProperty('$schema');
      expect(schema).toHaveProperty('type');
      // Only object schemas have additionalProperties
      if (schema.type === 'object') {
        expect(schema).toHaveProperty('additionalProperties');
        expect(schema.additionalProperties).toBe(false);
      }
    }
  });

  it('every tool has input and output schemas', () => {
    for (const tool of TOOLS) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.outputSchema).toBeDefined();
    }
  });

  it('tool names follow concert.* pattern', () => {
    for (const tool of TOOLS) {
      expect(tool.name).toMatch(/^concert\./);
    }
  });
});
