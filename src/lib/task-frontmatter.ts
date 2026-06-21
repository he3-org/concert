export interface ParsedTaskFrontmatter {
  task: string;
  title: string;
  phase?: string;
  depends_on: string[];
  wave: number;
  model?: 'simple' | 'average' | 'complex';
  extras?: Record<string, string>;
}

export interface ParseResult {
  frontmatter: ParsedTaskFrontmatter | null;
  body: string;
  bodyOffset: number;
  errors: string[];
}

export function parseTaskFrontmatter(md: string): ParseResult {
  const lines = md.split('\n');
  const errors: string[] = [];

  if (lines.length === 0 || lines[0] !== '---') {
    return {
      frontmatter: null,
      body: md,
      bodyOffset: 0,
      errors: [],
    };
  }

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    errors.push('Frontmatter opening --- found but no closing ---');
    return {
      frontmatter: null,
      body: md,
      bodyOffset: 0,
      errors,
    };
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const bodyOffset = closingIndex + 1;
  const body = lines.slice(bodyOffset).join('\n');

  const parsed: Record<string, unknown> = {};
  const extras: Record<string, string> = {};

  for (const line of frontmatterLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      errors.push(`Malformed frontmatter line (no colon): ${trimmed}`);
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    value = stripQuotes(value);

    if (key === 'depends_on') {
      parsed[key] = parseArray(value);
    } else if (key === 'wave') {
      const num = Number(value);
      if (Number.isFinite(num)) {
        parsed[key] = num;
      } else {
        errors.push(`Invalid wave value: ${value}`);
        parsed[key] = 0;
      }
    } else if (key === 'model') {
      if (value === 'simple' || value === 'average' || value === 'complex') {
        parsed[key] = value;
      } else {
        extras[key] = value;
      }
    } else if (key === 'task' || key === 'title' || key === 'phase') {
      parsed[key] = value;
    } else {
      extras[key] = value;
    }
  }

  if (!parsed.task || !parsed.title) {
    errors.push('Frontmatter must have at least "task" and "title"');
    return {
      frontmatter: null,
      body,
      bodyOffset,
      errors,
    };
  }

  const frontmatter: ParsedTaskFrontmatter = {
    task: parsed.task as string,
    title: parsed.title as string,
    depends_on: (parsed.depends_on as string[]) ?? [],
    wave: (parsed.wave as number) ?? 0,
  };

  if (parsed.phase) frontmatter.phase = parsed.phase as string;
  if (parsed.model) frontmatter.model = parsed.model as 'simple' | 'average' | 'complex';
  if (Object.keys(extras).length > 0) frontmatter.extras = extras;

  return {
    frontmatter,
    body,
    bodyOffset,
    errors,
  };
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseArray(s: string): string[] {
  const match = /^\[(.*)\]$/.exec(s);
  if (!match) return [];
  const inner = match[1]!.trim();
  if (!inner) return [];
  return inner.split(',').map((item) => stripQuotes(item.trim()));
}
