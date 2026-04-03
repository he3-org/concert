import * as jsonc from 'jsonc-parser';

export interface MergeReport {
  added: string[]; // "cost.new_field"
  removed: string[]; // "deprecated_field"
  warnings: string[]; // "Type mismatch: pipeline.tasks expected string, got number"
}

/**
 * Deep merge state objects following the Concert merge rules:
 * - New fields from template are added with default values
 * - Existing user values are preserved
 * - Deprecated fields (in current but not in template) are removed
 * - Arrays are preserved as-is (not merged element-by-element)
 * - Type mismatches produce warnings but preserve user's value
 */
export function mergeState(
  current: Record<string, unknown>,
  template: Record<string, unknown>
): { merged: Record<string, unknown>; report: MergeReport } {
  const report: MergeReport = { added: [], removed: [], warnings: [] };
  const merged = mergeObjects(current, template, '', report);
  return { merged, report };
}

function mergeObjects(
  current: Record<string, unknown>,
  template: Record<string, unknown>,
  keyPath: string,
  report: MergeReport
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Add or preserve fields that exist in template
  for (const [key, templateValue] of Object.entries(template)) {
    const fullPath = keyPath ? `${keyPath}.${key}` : key;

    if (!(key in current)) {
      // New field from template — add with default
      result[key] = templateValue;
      report.added.push(fullPath);
    } else {
      const currentValue = current[key];

      // Arrays are preserved as-is
      if (Array.isArray(templateValue)) {
        result[key] = currentValue;
        continue;
      }

      // Null values in template — preserve user value if exists
      if (templateValue === null) {
        result[key] = currentValue;
        continue;
      }

      // Both are objects — recurse
      if (isPlainObject(templateValue) && isPlainObject(currentValue)) {
        result[key] = mergeObjects(
          currentValue as Record<string, unknown>,
          templateValue as Record<string, unknown>,
          fullPath,
          report
        );
        continue;
      }

      // Type mismatch check (skip if template is null/undefined)
      if (
        templateValue !== null &&
        templateValue !== undefined &&
        currentValue !== null &&
        currentValue !== undefined &&
        typeof currentValue !== typeof templateValue
      ) {
        report.warnings.push(
          `Type mismatch at ${fullPath}: template expects ${typeof templateValue}, got ${typeof currentValue}`
        );
      }

      // Preserve user's value
      result[key] = currentValue;
    }
  }

  // Check for deprecated fields (in current but not in template)
  for (const key of Object.keys(current)) {
    const fullPath = keyPath ? `${keyPath}.${key}` : key;
    if (!(key in template)) {
      report.removed.push(fullPath);
      // Do NOT add to result — this removes deprecated fields
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Merge JSONC config preserving comments.
 * Uses jsonc-parser's modify API to add/remove fields while preserving comments.
 */
export function mergeConfig(
  currentRaw: string,
  template: Record<string, unknown>
): { mergedRaw: string; report: MergeReport } {
  const report: MergeReport = { added: [], removed: [], warnings: [] };

  const errors: jsonc.ParseError[] = [];
  const current = jsonc.parse(currentRaw, errors, { allowTrailingComma: true }) as Record<
    string,
    unknown
  >;
  if (errors.length > 0) {
    throw new Error(
      `Failed to parse current config: ${errors.map((e) => jsonc.printParseErrorCode(e.error)).join(', ')}`
    );
  }

  let mergedRaw = currentRaw;

  // Add new fields from template
  mergedRaw = addMissingFields(mergedRaw, current, template, [], report);

  // Remove deprecated fields
  mergedRaw = removeDeprecatedFields(mergedRaw, current, template, [], report);

  return { mergedRaw, report };
}

function addMissingFields(
  raw: string,
  current: Record<string, unknown>,
  template: Record<string, unknown>,
  pathPrefix: (string | number)[],
  report: MergeReport
): string {
  let result = raw;

  for (const [key, templateValue] of Object.entries(template)) {
    const jsonPath = [...pathPrefix, key];
    const fullPath = jsonPath.join('.');

    if (!(key in current)) {
      // New field — add with template default
      const edits = jsonc.modify(result, jsonPath, templateValue, {
        formattingOptions: { tabSize: 2, insertSpaces: true, eol: '\n' },
      });
      result = jsonc.applyEdits(result, edits);
      report.added.push(fullPath);
    } else if (
      isPlainObject(templateValue) &&
      isPlainObject(current[key]) &&
      !Array.isArray(templateValue)
    ) {
      // Recurse into nested objects
      result = addMissingFields(
        result,
        current[key] as Record<string, unknown>,
        templateValue as Record<string, unknown>,
        jsonPath,
        report
      );
    }
  }

  return result;
}

function removeDeprecatedFields(
  raw: string,
  current: Record<string, unknown>,
  template: Record<string, unknown>,
  pathPrefix: (string | number)[],
  report: MergeReport
): string {
  let result = raw;

  for (const key of Object.keys(current)) {
    const jsonPath = [...pathPrefix, key];
    const fullPath = jsonPath.join('.');

    if (!(key in template)) {
      // Deprecated field — remove
      const edits = jsonc.modify(result, jsonPath, undefined, {
        formattingOptions: { tabSize: 2, insertSpaces: true, eol: '\n' },
      });
      result = jsonc.applyEdits(result, edits);
      report.removed.push(fullPath);
    } else if (
      isPlainObject(current[key]) &&
      isPlainObject(template[key]) &&
      !Array.isArray(current[key])
    ) {
      // Recurse into nested objects
      result = removeDeprecatedFields(
        result,
        current[key] as Record<string, unknown>,
        template[key] as Record<string, unknown>,
        jsonPath,
        report
      );
    }
  }

  return result;
}
