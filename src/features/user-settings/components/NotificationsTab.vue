<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useUserSettingsStore } from '../stores/user-settings-store';
import PreferencesNotificationsCard from './preferences/PreferencesNotificationsCard.vue';

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
    <div class="notifications-tab">
        <v-row class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-2">
                <AppAlert v-if="localError" type="error" class="mb-4" closable @dismiss="localError = null">
                    {{ localError }}
                </AppAlert>
            </v-col>
            <v-col cols="12" md="9">
                <div v-if="loading" class="d-flex justify-center py-6">
                    <v-progress-circular indeterminate color="primary" size="28" />
                </div>
                <PreferencesNotificationsCard v-else v-model="draft" />
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.notifications-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
