import { TOOLS } from './registry.js';

export interface ToolCatalogueItem {
  name: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
}

/**
 * Get the tool catalogue without requiring the SDK.
 */
export function inspectCatalogue(): ToolCatalogueItem[] {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    outputSchema: t.outputSchema,
  }));
}

/**
 * Start the MCP stdio server. Lazy-loads @modelcontextprotocol/sdk.
 */
export async function startStdioServer(cwd: string): Promise<void> {
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');

  const server = new Server(
    {
      name: 'concert',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.setRequestHandler('tools/list' as any, async () => {
    return {
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.setRequestHandler(
    'tools/call' as any,
    async (request: { params: { name: string; arguments?: unknown } }) => {
      const toolName = request.params.name;
      const tool = TOOLS.find((t) => t.name === toolName);

      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const args = (request.params.arguments ?? {}) as unknown;
      const result = await tool.handler(args, { cwd });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Block indefinitely — server runs until the stdio transport closes.
  await new Promise<void>(() => {});
}
