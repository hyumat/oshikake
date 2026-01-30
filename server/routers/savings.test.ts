import { describe, expect, it } from 'vitest';
import { savingsRouter } from './savings';

describe('savings router', () => {
  it('should have listRules procedure', () => {
    const router = savingsRouter;
    expect(router._def.procedures.listRules).toBeDefined();
  });

  it('should have addRule procedure', () => {
    const router = savingsRouter;
    expect(router._def.procedures.addRule).toBeDefined();
  });

  it('should have deleteRule procedure', () => {
    const router = savingsRouter;
    expect(router._def.procedures.deleteRule).toBeDefined();
  });

  it('should have toggleRule procedure', () => {
    const router = savingsRouter;
    expect(router._def.procedures.toggleRule).toBeDefined();
  });

  it('should have getHistory procedure', () => {
    const router = savingsRouter;
    expect(router._def.procedures.getHistory).toBeDefined();
  });

  it('should have getTotalSavings procedure', () => {
    const router = savingsRouter;
    expect(router._def.procedures.getTotalSavings).toBeDefined();
  });

  it('should have triggerSavings procedure', () => {
    const router = savingsRouter;
    expect(router._def.procedures.triggerSavings).toBeDefined();
  });

  it('should have testTrigger procedure', () => {
    const router = savingsRouter;
    expect(router._def.procedures.testTrigger).toBeDefined();
  });

  it('should have checkPendingSavings procedure', () => {
    const router = savingsRouter;
    expect(router._def.procedures.checkPendingSavings).toBeDefined();
  });
});
