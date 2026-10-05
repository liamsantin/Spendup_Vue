import { describe, expect, it } from 'vitest';
import { SAVINGS_GOALS_PATHS, savingsGoalDetailPath, savingsGoalPublicIdFromPath } from '@/features/savings-goals/paths';

describe('savings-goals paths', () => {
    it('construit le détail et relit le publicId', () => {
        expect(SAVINGS_GOALS_PATHS.list).toBe('/app/planning/objectifs');
        expect(savingsGoalDetailPath('guid-1')).toBe('/app/planning/objectifs/guid-1');
        expect(savingsGoalPublicIdFromPath('/app/planning/objectifs')).toBeNull();
        expect(savingsGoalPublicIdFromPath('/app/planning/objectifs/guid-1')).toBe('guid-1');
        expect(savingsGoalPublicIdFromPath('/app/planning/objectifs/guid-1?x=1')).toBe('guid-1');
    });
});
