import { inspectCatalogue, startStdioServer } from '../mcp/server.js';

export async function runServe(cwd: string, args: string[]): Promise<number> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: concert serve [--inspect]

Start the Concert MCP stdio server.

Options:
  --inspect    Print tool catalogue as JSON and exit (no SDK required)
  --help, -h   Show this help message`);
    return 0;
  }

  if (args.includes('--inspect')) {
    const catalogue = inspectCatalogue();
    console.log(JSON.stringify(catalogue, null, 2));
    return 0;
  }

  try {
    await startStdioServer(cwd);
    return 0;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Cannot find package')) {
      console.error(
        'Error: @modelcontextprotocol/sdk is not installed. Run: npm install @modelcontextprotocol/sdk'
      );
      return 1;
    }
    throw err;
  }
}
