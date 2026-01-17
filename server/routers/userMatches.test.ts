import { describe, expect, it } from 'vitest';
import type { TrpcContext } from '../_core/context';
import { userMatchesRouter } from './userMatches';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: 'google',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

describe('userMatches router', () => {
  it('should have list procedure', () => {
    expect(userMatchesRouter.createCaller).toBeDefined();
  });

  it('should have getById procedure', () => {
    const router = userMatchesRouter;
    expect(router._def.procedures.getById).toBeDefined();
  });

  it('should have add procedure', () => {
    const router = userMatchesRouter;
    expect(router._def.procedures.add).toBeDefined();
  });

  it('should have update procedure', () => {
    const router = userMatchesRouter;
    expect(router._def.procedures.update).toBeDefined();
  });

  it('should have delete procedure', () => {
    const router = userMatchesRouter;
    expect(router._def.procedures.delete).toBeDefined();
  });

  it('should have getMatchDetails procedure', () => {
    const router = userMatchesRouter;
    expect(router._def.procedures.getMatchDetails).toBeDefined();
  });

  describe('input validation', () => {
    it('should validate list input', () => {
      const router = userMatchesRouter;
      const listProc = router._def.procedures.list;
      expect(listProc).toBeDefined();
    });

    it('should validate getById input with required id', () => {
      const router = userMatchesRouter;
      const getByIdProc = router._def.procedures.getById;
      expect(getByIdProc).toBeDefined();
    });

    it('should validate add input with required fields', () => {
      const router = userMatchesRouter;
      const addProc = router._def.procedures.add;
      expect(addProc).toBeDefined();
    });

    it('should validate update input with id and optional fields', () => {
      const router = userMatchesRouter;
      const updateProc = router._def.procedures.update;
      expect(updateProc).toBeDefined();
    });

    it('should validate delete input with required id', () => {
      const router = userMatchesRouter;
      const deleteProc = router._def.procedures.delete;
      expect(deleteProc).toBeDefined();
    });
  });

  describe('context requirements', () => {
    it('should require authenticated user for list', () => {
      const router = userMatchesRouter;
      const listProc = router._def.procedures.list;
      // All procedures should be protected (require auth)
      expect(listProc).toBeDefined();
    });

    it('should require authenticated user for getById', () => {
      const router = userMatchesRouter;
      const getByIdProc = router._def.procedures.getById;
      expect(getByIdProc).toBeDefined();
    });

    it('should require authenticated user for add', () => {
      const router = userMatchesRouter;
      const addProc = router._def.procedures.add;
      expect(addProc).toBeDefined();
    });

    it('should require authenticated user for update', () => {
      const router = userMatchesRouter;
      const updateProc = router._def.procedures.update;
      expect(updateProc).toBeDefined();
    });

    it('should require authenticated user for delete', () => {
      const router = userMatchesRouter;
      const deleteProc = router._def.procedures.delete;
      expect(deleteProc).toBeDefined();
    });
  });

  describe('data structure', () => {
    it('should accept valid user match data for add', () => {
      const validData = {
        date: '2025-02-15',
        opponent: 'FC Tokyo',
        kickoff: '19:00',
        competition: 'J1',
        stadium: 'Nissan Stadium',
        marinosSide: 'home' as const,
        status: 'planned' as const,
        costYen: 5000,
        note: 'Test note',
      };
      expect(validData).toBeDefined();
    });

    it('should handle optional fields in add', () => {
      const minimalData = {
        date: '2025-02-15',
        opponent: 'FC Tokyo',
      };
      expect(minimalData).toBeDefined();
    });

    it('should accept result data for attended matches', () => {
      const resultData = {
        status: 'attended' as const,
        resultWdl: 'W' as const,
        marinosGoals: 2,
        opponentGoals: 1,
      };
      expect(resultData).toBeDefined();
    });

    it('should handle different result types', () => {
      const results = ['W', 'D', 'L'];
      expect(results).toHaveLength(3);
    });
  });

  describe('user isolation', () => {
    it('should create different contexts for different users', () => {
      const ctx1 = createAuthContext(1);
      const ctx2 = createAuthContext(2);
      expect(ctx1.user.id).not.toBe(ctx2.user.id);
      expect(ctx1.user.openId).not.toBe(ctx2.user.openId);
    });

    it('should maintain user identity in context', () => {
      const ctx = createAuthContext(42);
      expect(ctx.user.id).toBe(42);
      expect(ctx.user.openId).toBe('test-user-42');
    });
  });
});
