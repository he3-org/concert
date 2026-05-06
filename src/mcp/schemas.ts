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
    recentToolCalls: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'ts', 'tool', 'ok', 'duration_ms'],
        additionalProperties: false,
        properties: {
          id: { type: 'integer' },
          ts: { type: 'string' },
          mission_slug: { type: ['string', 'null'] },
          tool: { type: 'string' },
          ok: { type: 'boolean' },
          error_class: { type: ['string', 'null'] },
          duration_ms: { type: 'integer' },
          doc: { type: ['string', 'null'] },
          section: { type: ['string', 'null'] },
        },
      },
    },
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
    section: { type: 'string', description: 'Single section slug (use `sections` for batch)' },
    sections: {
      type: 'array',
      items: { type: 'string' },
      description: 'Batch of section slugs to mark in one call (preferred over multiple calls)',
    },
    source: { type: 'string', description: 'Optional source reference' },
    mission: { type: 'string', description: 'Mission slug (default: active)' },
  },
  required: ['doc'],
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
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string' },
          alreadyMarked: { type: 'boolean' },
          ok: { type: 'boolean' },
          error: { type: 'string' },
        },
        required: ['section', 'alreadyMarked', 'ok'],
        additionalProperties: false,
      },
    },
    error: { type: 'string' },
  },
  required: ['ok', 'doc'],
  additionalProperties: false,
} as const;

// === concert.clear_section_modified ===

export const clearSectionModifiedInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    doc: { type: 'string', description: 'Document path relative to mission' },
    section: { type: 'string', description: 'Single section slug (use `sections` for batch)' },
    sections: {
      type: 'array',
      items: { type: 'string' },
      description: 'Batch of section slugs to clear in one call (preferred over multiple calls)',
    },
    mission: { type: 'string', description: 'Mission slug (default: active)' },
  },
  required: ['doc'],
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
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string' },
          removed: { type: 'boolean' },
        },
        required: ['section', 'removed'],
        additionalProperties: false,
      },
    },
    error: { type: 'string' },
  },
  required: ['ok', 'doc'],
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

// === concert.list_tasks ===

export const listTasksInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    mission: { type: 'string' },
    phase: { type: 'string' },
    wave: { type: 'integer', minimum: 0 },
    model: { type: 'string', enum: ['haiku', 'sonnet', 'opus'] },
    status: { type: 'string', enum: ['pending', 'in-progress', 'done'] },
  },
  additionalProperties: false,
} as const;

export const listTasksOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          task: { type: 'string' },
          title: { type: 'string' },
          phase: { type: ['string', 'null'] },
          wave: { type: 'integer' },
          model: { type: ['string', 'null'] },
          dependsOn: { type: 'array', items: { type: 'string' } },
          filePath: { type: 'string' },
          totalAcceptance: { type: 'integer' },
          completedAcceptance: { type: 'integer' },
          status: { type: 'string', enum: ['pending', 'in-progress', 'done'] },
        },
        required: [
          'task',
          'title',
          'phase',
          'wave',
          'model',
          'dependsOn',
          'filePath',
          'totalAcceptance',
          'completedAcceptance',
          'status',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['tasks'],
  additionalProperties: false,
} as const;

// === concert.get_task ===

export const getTaskInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    task: { type: 'string' },
    mission: { type: 'string' },
  },
  required: ['task'],
  additionalProperties: false,
} as const;

export const getTaskOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    found: { type: 'boolean' },
    task: { type: 'string' },
    title: { type: 'string' },
    phase: { type: 'string' },
    wave: { type: 'integer' },
    model: { type: 'string', enum: ['haiku', 'sonnet', 'opus'] },
    dependsOn: { type: 'array', items: { type: 'string' } },
    filePath: { type: 'string' },
    acceptance: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          text: { type: 'string' },
          done: { type: 'boolean' },
        },
        required: ['index', 'text', 'done'],
        additionalProperties: false,
      },
    },
    body: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        filesToModify: { type: 'string' },
        testsToWrite: { type: 'string' },
        skills: { type: 'string' },
        notes: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  required: ['found'],
  additionalProperties: false,
} as const;

// === concert.set_task_acceptance ===

export const setTaskAcceptanceInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    task: { type: 'string' },
    index: { type: 'integer', minimum: 0 },
    text: { type: 'string' },
    checked: { type: 'boolean' },
    mission: { type: 'string' },
  },
  required: ['task', 'checked'],
  additionalProperties: false,
} as const;

export const setTaskAcceptanceOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    task: { type: 'string' },
    filePath: { type: 'string' },
    previous: { type: 'boolean' },
    current: { type: 'boolean' },
    totalAcceptance: { type: 'integer' },
    completedAcceptance: { type: 'integer' },
    error: { type: 'string' },
  },
  required: ['ok', 'task'],
  additionalProperties: false,
} as const;

// === concert.render_plan ===

export const renderPlanInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    mission: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const renderPlanOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    missionPlanPath: { type: 'string' },
    tasksRendered: { type: 'integer' },
    phasesRendered: { type: 'integer' },
    error: { type: 'string' },
  },
  required: ['ok'],
  additionalProperties: false,
} as const;

// === concert.get_summary ===

export const getSummaryInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

export const getSummaryOutputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    missions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          stage: { type: ['string', 'null'] },
          tasksTotal: { type: 'integer' },
          tasksDone: { type: 'integer' },
          tasksInProgress: { type: 'integer' },
          tasksPending: { type: 'integer' },
          gapsCritical: { type: 'integer' },
          gapsMajor: { type: 'integer' },
          gapsMinor: { type: 'integer' },
          gapsNice: { type: 'integer' },
          refactorP0: { type: 'integer' },
          refactorP1: { type: 'integer' },
          refactorP2: { type: 'integer' },
        },
        required: [
          'slug',
          'stage',
          'tasksTotal',
          'tasksDone',
          'tasksInProgress',
          'tasksPending',
          'gapsCritical',
          'gapsMajor',
          'gapsMinor',
          'gapsNice',
          'refactorP0',
          'refactorP1',
          'refactorP2',
        ],
        additionalProperties: false,
      },
    },
    generatedAt: { type: 'string' },
  },
  required: ['missions', 'generatedAt'],
  additionalProperties: false,
} as const;

// === concert.get_events ===

export const getEventsInputSchema = {
  ...schemaBase,
  type: 'object',
  properties: {
    mission: { type: 'string', description: 'Filter by mission slug' },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
  additionalProperties: false,
} as const;

export const getEventsOutputSchema = {
  ...schemaBase,
  type: 'object',
  required: ['events', 'total', 'generatedAt'],
  additionalProperties: false,
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'ts', 'tool', 'ok', 'duration_ms'],
        additionalProperties: false,
        properties: {
          id: { type: 'integer' },
          ts: { type: 'string' },
          mission_slug: { type: ['string', 'null'] },
          tool: { type: 'string' },
          ok: { type: 'boolean' },
          error_class: { type: ['string', 'null'] },
          duration_ms: { type: 'integer' },
          doc: { type: ['string', 'null'] },
          section: { type: ['string', 'null'] },
        },
      },
    },
    total: { type: 'integer' },
    generatedAt: { type: 'string' },
  },
} as const;
