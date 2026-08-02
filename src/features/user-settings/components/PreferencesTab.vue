<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import AppAlert from '@/components/shared/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useUserSettingsStore } from '../stores/user-settings-store';
import PreferencesPrivacyCard from './preferences/PreferencesPrivacyCard.vue';
import PreferencesNotificationsCard from './preferences/PreferencesNotificationsCard.vue';
import PreferencesRegionalCard from './preferences/PreferencesRegionalCard.vue';
import PreferencesThemeColorsCard from './preferences/PreferencesThemeColorsCard.vue';
import PreferencesDashboardCard from './preferences/PreferencesDashboardCard.vue';

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
            <v-progress-circular indeterminate color="primary" size="36" />
        </div>

        <v-row v-else class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-2">
                <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
                    {{ localError }}
                </AppAlert>
            </v-col>

            <v-col cols="12" md="9" class="pb-4">
                <PreferencesPrivacyCard v-model="draft" />
            </v-col>
            <v-col cols="12" md="9" class="pb-4">
                <PreferencesNotificationsCard v-model="draft" />
            </v-col>
            <v-col cols="12" md="9" class="pb-4">
                <PreferencesRegionalCard v-model="draft" />
            </v-col>
            <v-col cols="12" md="9" class="pb-4">
                <PreferencesThemeColorsCard v-model="draft" />
            </v-col>
            <v-col cols="12" md="9" class="pb-4">
                <PreferencesDashboardCard v-model="draft" />
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.preferences-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
