import { ref, toValue, type MaybeRefOrGetter } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

/** Intercepte la navigation tant que le formulaire de la page est dirty. */
export function useDirtyPageGuard(isDirty: MaybeRefOrGetter<boolean>, onDiscard?: () => void) {
    const leaveConfirmOpen = ref(false);
    let leaveResolve: ((ok: boolean) => void) | null = null;

    onBeforeRouteLeave((_to, _from, next) => {
        if (!toValue(isDirty)) {
            next();
            return;
        }
        leaveConfirmOpen.value = true;
        leaveResolve = (ok) => {
            leaveResolve = null;
            next(ok);
        };
    });

    function onLeaveOpenChange(open: boolean) {
        leaveConfirmOpen.value = open;
        if (!open && leaveResolve) {
            leaveResolve(false);
            leaveResolve = null;
        }
    }

    function confirmLeave() {
        const resolve = leaveResolve;
        leaveResolve = null;
        onDiscard?.();
        leaveConfirmOpen.value = false;
        resolve?.(true);
    }

    return { leaveConfirmOpen, onLeaveOpenChange, confirmLeave };
}
