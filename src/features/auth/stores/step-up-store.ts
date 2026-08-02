import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { StepUpProof, StepUpRequiredDetails } from '@/features/auth/types';

export const useStepUpStore = defineStore('step-up', () => {
    const open = ref(false);
    const details = ref<StepUpRequiredDetails | null>(null);
    let waiter: ((proof: StepUpProof | null) => void) | null = null;

    function prompt(challenge: StepUpRequiredDetails): Promise<StepUpProof | null> {
        if (waiter) {
            waiter(null);
            waiter = null;
        }
        details.value = challenge;
        open.value = true;
        return new Promise((resolve) => {
            waiter = resolve;
        });
    }

    function confirm(proof: StepUpProof) {
        open.value = false;
        const resolve = waiter;
        waiter = null;
        details.value = null;
        resolve?.(proof);
    }

    function cancel() {
        open.value = false;
        const resolve = waiter;
        waiter = null;
        details.value = null;
        resolve?.(null);
    }

    return {
        open,
        details,
        prompt,
        confirm,
        cancel
    };
});
