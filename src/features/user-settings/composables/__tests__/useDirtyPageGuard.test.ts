import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';

const onBeforeRouteLeave = vi.fn();

vi.mock('vue-router', () => ({
    onBeforeRouteLeave: (guard: unknown) => onBeforeRouteLeave(guard)
}));

import { useDirtyPageGuard } from '@/features/user-settings/composables/useDirtyPageGuard';

const route = {} as RouteLocationNormalized;

describe('useDirtyPageGuard', () => {
    beforeEach(() => {
        onBeforeRouteLeave.mockReset();
    });

    function mountGuard(isDirty: { value: boolean }, onDiscard?: () => void) {
        let captured: ((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => void) | undefined;
        onBeforeRouteLeave.mockImplementation((guard: typeof captured) => {
            captured = guard;
        });

        const wrapper = mount(
            defineComponent({
                setup() {
                    return useDirtyPageGuard(() => isDirty.value, onDiscard);
                },
                template: '<div />'
            })
        );

        return { wrapper, captured: captured! };
    }

    it('laisse passer si le formulaire n’est pas dirty', () => {
        const dirty = ref(false);
        const { captured } = mountGuard(dirty);
        const next = vi.fn();

        captured(route, route, next);

        expect(next).toHaveBeenCalledWith();
    });

    it('bloque la navigation et confirme après discard', () => {
        const dirty = ref(true);
        const onDiscard = vi.fn();
        const { wrapper, captured } = mountGuard(dirty, onDiscard);
        const next = vi.fn();

        captured(route, route, next);
        expect(next).not.toHaveBeenCalled();
        expect(wrapper.vm.leaveConfirmOpen).toBe(true);

        wrapper.vm.confirmLeave();

        expect(onDiscard).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith(true);
        expect(wrapper.vm.leaveConfirmOpen).toBe(false);
    });

    it('annule la navigation si la modale se ferme', () => {
        const dirty = ref(true);
        const { wrapper, captured } = mountGuard(dirty);
        const next = vi.fn();

        captured(route, route, next);
        wrapper.vm.onLeaveOpenChange(false);

        expect(next).toHaveBeenCalledWith(false);
        expect(wrapper.vm.leaveConfirmOpen).toBe(false);
    });
});
