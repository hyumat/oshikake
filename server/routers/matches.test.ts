import { describe, expect, it } from 'vitest';
import { matchesRouter } from './matches';

describe('matches router', () => {
  it('should have fetchOfficial procedure', () => {
    const router = matchesRouter;
    expect(router._def.procedures.fetchOfficial).toBeDefined();
  });

  it('should have listOfficial procedure', () => {
    const router = matchesRouter;
    expect(router._def.procedures.listOfficial).toBeDefined();
  });

  it('should have getById procedure', () => {
    const router = matchesRouter;
    expect(router._def.procedures.getById).toBeDefined();
  });

  it('should have syncFromSheets procedure', () => {
    const router = matchesRouter;
    expect(router._def.procedures.syncFromSheets).toBeDefined();
  });

  it('should have getSheetsSyncLogs procedure', () => {
    const router = matchesRouter;
    expect(router._def.procedures.getSheetsSyncLogs).toBeDefined();
  });
});
