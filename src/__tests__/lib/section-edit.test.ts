import { describe, it, expect } from 'vitest';
import { insertOrRefreshMarker, removeMarker, replaceSectionBody } from '../../lib/section-edit.js';

const SAMPLE_MD = `# Document

## Introduction

This is the intro.

## Features

The features are:
- Feature 1
- Feature 2

## Conclusion

The end.
`;

describe('section-edit', () => {
  describe('insertOrRefreshMarker', () => {
    it('inserts marker after heading', () => {
      const result = insertOrRefreshMarker(SAMPLE_MD, 'features');
      expect(result).toContain('## Features\n<!-- CONCERT:MODIFIED:features -->');
    });

    it('refreshes existing marker', () => {
      const marked = insertOrRefreshMarker(SAMPLE_MD, 'features');
      const refreshed = insertOrRefreshMarker(marked, 'features', 'new-source');
      expect(refreshed).toContain('<!-- CONCERT:MODIFIED:features — source: new-source -->');
      const count = (refreshed.match(/CONCERT:MODIFIED:features/g) || []).length;
      expect(count).toBe(1);
    });

    it('throws if section not found', () => {
      expect(() => insertOrRefreshMarker(SAMPLE_MD, 'nonexistent')).toThrow(/section not found/);
    });
  });

  describe('removeMarker', () => {
    it('removes marker from section', () => {
      const marked = insertOrRefreshMarker(SAMPLE_MD, 'features');
      const cleaned = removeMarker(marked, 'features');
      expect(cleaned).not.toContain('CONCERT:MODIFIED:features');
    });

    it('no-ops when marker absent', () => {
      const cleaned = removeMarker(SAMPLE_MD, 'features');
      expect(cleaned).toBe(SAMPLE_MD);
    });
  });

  describe('replaceSectionBody', () => {
    it('replaces body and preserves heading', () => {
      const newBody = 'New features:\n- A\n- B\n';
      const result = replaceSectionBody(SAMPLE_MD, 'features', newBody);
      expect(result).toContain('## Features');
      expect(result).toContain('New features:');
      expect(result).toContain('## Conclusion');
      expect(result).not.toContain('Feature 1');
    });

    it('throws if section not found', () => {
      expect(() => replaceSectionBody(SAMPLE_MD, 'nonexistent', 'body')).toThrow(
        /section not found/
      );
    });
  });
});
