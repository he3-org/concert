// Hand-written JSON Schema objects (Draft-07) for MCP tool inputs and outputs

const schemaBase = {
  $schema: 'http://json-schema.org/draft-07/schema#',
} as const;

// === concert.get_state ===

export const getStateInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    mission: {
      type: 'string',
      description: 'Mission slug (default: active mission)',
    },
  },
  additionalProperties: false,
} as const;

export const getStateOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    mission: { type: 'string' },
    missionPath: { type: 'string' },
    stage: { type: 'string' },
    branch: { type: 'string' },
    prNumber: { type: 'number' },
    statusDisplay: { type: 'string' },
    pipeline: { type: 'object' },
    phasesCompleted: { type: 'number' },
    phasesTotal: { type: 'number' },
    tasksCompleted: { type: 'number' },
    tasksTotal: { type: 'number' },
    commits: { type: 'number' },
    nextAction: { type: ['string', 'null'] },
    blockers: { type: 'array', items: { type: 'string' } },
    recentFailures: { type: 'array' },
    found: { type: 'boolean' },
  },
  required: [
    'mission',
    'missionPath',
    'stage',
    'branch',
    'prNumber',
    'statusDisplay',
    'pipeline',
    'phasesCompleted',
    'phasesTotal',
    'tasksCompleted',
    'tasksTotal',
    'commits',
    'nextAction',
    'blockers',
    'recentFailures',
    'found',
  ],
  additionalProperties: false,
} as const;

// === concert.get_status ===

export const getStatusInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    mission: {
      type: 'string',
      description: 'Mission slug (default: active mission)',
    },
  },
  additionalProperties: false,
} as const;

export const getStatusOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    mission: { type: 'string' },
    missionPath: { type: 'string' },
    branch: { type: ['string', 'null'] },
    stage: { type: 'string' },
    found: { type: 'boolean' },
    pipeline: { type: 'object' },
    modifiedDocuments: { type: 'array' },
    developmentReviewGaps: { type: ['object', 'null'] },
    refactorPlan: { type: ['object', 'null'] },
    recentFailures: { type: 'array' },
    nextRecommendedAction: { type: 'string' },
    generatedAt: { type: 'string' },
  },
  required: [
    'mission',
    'missionPath',
    'branch',
    'stage',
    'found',
    'pipeline',
    'modifiedDocuments',
    'developmentReviewGaps',
    'refactorPlan',
    'recentFailures',
    'nextRecommendedAction',
    'generatedAt',
  ],
  additionalProperties: false,
} as const;

// === concert.list_missions ===

export const listMissionsInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

export const listMissionsOutputSchema = {
  ...schemaBase,
  type: 'array',
  items: {
    type: 'object',
    properties: {
      slug: { type: 'string' },
      path: { type: 'string' },
      stage: { type: ['string', 'null'] },
      lastTouchedIso: { type: ['string', 'null'] },
      isActive: { type: 'boolean' },
    },
    required: ['slug', 'path', 'stage', 'lastTouchedIso', 'isActive'],
    additionalProperties: false,
  },
} as const;

// === concert.get_section ===

export const getSectionInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    doc: {
      type: 'string',
      description: 'Path relative to mission_path or absolute under cwd',
    },
    section: {
      type: 'string',
      description: 'Section slug',
    },
    mission: {
      type: 'string',
      description: 'Mission slug (default: active mission)',
    },
  },
  required: ['doc', 'section'],
  additionalProperties: false,
} as const;

export const getSectionOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    doc: { type: 'string' },
    section: { type: 'string' },
    heading: { type: 'string' },
    body: { type: 'string' },
    modifiedMarker: { type: 'boolean' },
  },
  required: ['found', 'doc', 'section'],
  additionalProperties: false,
} as const;

// === concert.list_modified_sections ===

export const listModifiedSectionsInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    mission: {
      type: 'string',
      description: 'Mission slug (default: active mission)',
    },
  },
  additionalProperties: false,
} as const;

export const listModifiedSectionsOutputSchema = {
  ...schemaBase,
  type: 'array',
  items: {
    type: 'object',
    properties: {
      doc: { type: 'string' },
      wholeDoc: { type: 'boolean' },
      sectionSlugs: { type: 'array', items: { type: 'string' } },
    },
    required: ['doc', 'wholeDoc', 'sectionSlugs'],
    additionalProperties: false,
  },
} as const;

// === concert.mark_section_modified ===

export const markSectionModifiedInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    doc: { type: 'string', description: 'Document path relative to mission' },
    section: { type: 'string', description: 'Section slug' },
    source: { type: 'string', description: 'Optional source reference' },
    mission: { type: 'string', description: 'Mission slug (default: active)' },
  },
  required: ['doc', 'section'],
  additionalProperties: false,
} as const;

export const markSectionModifiedOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    doc: { type: 'string' },
    section: { type: 'string' },
    alreadyMarked: { type: 'boolean' },
    error: { type: 'string' },
  },
  required: ['ok', 'doc', 'section'],
  additionalProperties: false,
} as const;

// === concert.clear_section_modified ===

export const clearSectionModifiedInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    doc: { type: 'string', description: 'Document path relative to mission' },
    section: { type: 'string', description: 'Section slug' },
    mission: { type: 'string', description: 'Mission slug (default: active)' },
  },
  required: ['doc', 'section'],
  additionalProperties: false,
} as const;

export const clearSectionModifiedOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    doc: { type: 'string' },
    section: { type: 'string' },
    removed: { type: 'boolean' },
    error: { type: 'string' },
  },
  required: ['ok', 'doc', 'section'],
  additionalProperties: false,
} as const;

// === concert.replace_section ===

export const replaceSectionInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    doc: { type: 'string', description: 'Document path relative to mission' },
    section: { type: 'string', description: 'Section slug' },
    newBody: { type: 'string', description: 'New section body content' },
    mission: { type: 'string', description: 'Mission slug (default: active)' },
  },
  required: ['doc', 'section', 'newBody'],
  additionalProperties: false,
} as const;

export const replaceSectionOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    doc: { type: 'string' },
    section: { type: 'string' },
    bytesWritten: { type: 'number' },
    error: { type: 'string' },
  },
  required: ['ok', 'doc', 'section'],
  additionalProperties: false,
} as const;

// === concert.append_telemetry ===

export const appendTelemetryInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    record: {
      type: 'object',
      properties: {
        task_file: { type: 'string' },
        task_index: { type: 'number' },
        phase: { type: 'number' },
        model_assigned: { type: 'string', enum: ['haiku', 'sonnet', 'opus'] },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        review_result: { type: 'string', enum: ['PASS', 'NTH', 'MIN', 'MAJ', 'CRIT', 'none'] },
        revision_count: { type: 'number' },
        skills_loaded: { type: 'array', items: { type: 'string' } },
        files_changed: { type: 'number' },
        completed_at: { type: 'string' },
      },
      required: [
        'task_file',
        'task_index',
        'phase',
        'model_assigned',
        'confidence',
        'review_result',
        'revision_count',
        'skills_loaded',
        'files_changed',
        'completed_at',
      ],
      additionalProperties: false,
    },
    mission: { type: 'string', description: 'Mission slug (default: active)' },
  },
  required: ['record'],
  additionalProperties: false,
} as const;

export const appendTelemetryOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    count: { type: 'number' },
    error: { type: 'string' },
  },
  required: ['ok'],
  additionalProperties: false,
} as const;

// === concert.append_history ===

export const appendHistoryInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    entry: {
      type: 'object',
      properties: {
        action: { type: 'string' },
        timestamp: { type: 'string' },
        details: { type: 'string' },
      },
      required: ['action', 'timestamp', 'details'],
      additionalProperties: false,
    },
    mission: { type: 'string', description: 'Mission slug (default: active)' },
  },
  required: ['entry'],
  additionalProperties: false,
} as const;

export const appendHistoryOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    count: { type: 'number' },
    error: { type: 'string' },
  },
  required: ['ok'],
  additionalProperties: false,
} as const;

// === concert.alignment_check ===

export const alignmentCheckInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    mission: { type: 'string', description: 'Mission slug (default: active)' },
  },
  additionalProperties: false,
} as const;

export const alignmentCheckOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    missingDocs: { type: 'array', items: { type: 'string' } },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'major', 'minor', 'info'] },
          kind: { type: 'string' },
          message: { type: 'string' },
          docs: { type: 'array', items: { type: 'string' } },
        },
        required: ['severity', 'kind', 'message', 'docs'],
        additionalProperties: false,
      },
    },
    error: { type: 'string' },
  },
  required: ['ok'],
  additionalProperties: false,
} as const;
