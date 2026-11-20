<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useUserSettingsStore } from '@/features/user-settings/stores/user-settings-store';
import PreferencesRegionalCard from '@/features/user-settings/components/preferences/PreferencesRegionalCard.vue';
import PreferencesThemeColorsCard from '@/features/user-settings/components/preferences/PreferencesThemeColorsCard.vue';
import PreferencesDashboardCard from '@/features/user-settings/components/preferences/PreferencesDashboardCard.vue';

const store = useUserSettingsStore();
const { draft, isDirty, draftReady, saving } = storeToRefs(store);

const localError = ref<string | null>(null);

const emit = defineEmits<{
    dirty: [value: boolean];
}>();

const loading = computed(() => !draftReady.value);

watch(isDirty, (value) => emit('dirty', value), { immediate: true });

async function bootstrap() {
    try {
        await store.ensureLoaded();
        localError.value = null;
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

onMounted(() => {
    void bootstrap();
});

async function saveSettings() {
    if (saving.value || !isDirty.value) return;
    localError.value = null;
    try {
        await store.saveDraft();
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

function resetSettings() {
    if (saving.value || !isDirty.value) return;
    store.resetDraft();
    localError.value = null;
}

defineExpose({
    saveSettings,
    resetSettings,
    get loading() {
        return saving.value || loading.value;
    },
    get isDirty() {
        return isDirty.value;
    }
});
</script>

<template>
    <div class="preferences-tab">
        <div v-if="loading" class="d-flex justify-center py-10">
            <span class="su-spin" />
        </div>

        <div v-else class="preferences-tab__sections">
            <AppAlert v-if="localError" type="error" class="su-alert" closable @dismiss="localError = null">
                {{ localError }}
            </AppAlert>

            <PreferencesRegionalCard v-model="draft" />
            <PreferencesThemeColorsCard v-model="draft" />
            <PreferencesDashboardCard v-model="draft" />
        </div>
    </div>
</template>

<style scoped>
.preferences-tab {
    max-width: 100%;
    overflow-x: hidden;
}

/* Les sections s’enchaînent sur leurs filets 2 px ; pas de grille Vuetify. */
.preferences-tab__sections {
    display: flex;
    flex-direction: column;
}
</style>
