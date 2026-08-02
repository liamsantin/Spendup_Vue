import { createPinia, setActivePinia } from 'pinia';

/** Pinia isolé pour chaque test de store. */
export function createTestPinia() {
    const pinia = createPinia();
    setActivePinia(pinia);
    return pinia;
}
