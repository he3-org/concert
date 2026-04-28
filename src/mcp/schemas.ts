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
