<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CheckIcon, LanguageIcon } from 'vue-tabler-icons';
import { useAppSettingsStore } from '@/app/stores/app-settings-store';
import { APP_LOCALES, type AppLocale } from '@/plugins/i18n';

const { t } = useI18n();
const appSettings = useAppSettingsStore();

const draftLocale = ref<AppLocale>(appSettings.locale);
const baseline = ref<AppLocale | null>(null);
const saving = ref(false);

const isDirty = computed(() => {
    if (!baseline.value) return false;
    return draftLocale.value !== baseline.value;
});

const emit = defineEmits<{
    dirty: [value: boolean];
}>();

watch(isDirty, (value) => emit('dirty', value), { immediate: true });

watch(
    () => appSettings.locale,
    (value) => {
        if (!isDirty.value) {
            draftLocale.value = value;
            baseline.value = value;
        }
    }
);

onMounted(() => {
    draftLocale.value = appSettings.locale;
    baseline.value = appSettings.locale;
});

function saveSettings() {
    if (saving.value || !isDirty.value) return;
    saving.value = true;
    try {
        appSettings.SET_LOCALE(draftLocale.value);
        baseline.value = draftLocale.value;
    } finally {
        saving.value = false;
    }
}

function resetSettings() {
    if (!baseline.value || saving.value) return;
    draftLocale.value = baseline.value;
}

defineExpose({
    saveSettings,
    resetSettings,
    get loading() {
        return saving.value;
    },
    get isDirty() {
        return isDirty.value;
    }
});
</script>

<template>
    <div class="language-tab">
        <v-row class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center ga-3 flex-wrap">
                            <v-avatar size="48" rounded="md" color="lightprimary">
                                <LanguageIcon class="text-primary" size="25" />
                            </v-avatar>
                            <h4 class="text-h4 mb-0">{{ t('applications.language.title') }}</h4>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            {{ t('applications.language.subtitle') }}
                        </div>

                        <h6 class="text-h6 mt-2 mb-5">{{ t('applications.language.interfaceLanguage') }}</h6>
                        <v-item-group v-model="draftLocale" mandatory class="ml-n2 v-row">
                            <v-col v-for="code in APP_LOCALES" :key="code" cols="6" sm="4" class="pa-2">
                                <v-item v-slot="{ isSelected, toggle }" :value="code">
                                    <v-sheet
                                        rounded="md"
                                        class="border cursor-pointer d-block text-center px-4 py-5 hover-btns"
                                        elevation="9"
                                        @click="toggle"
                                    >
                                        <div class="d-flex align-center justify-center ga-2">
                                            <v-avatar v-if="isSelected" color="primary" size="22">
                                                <CheckIcon color="white" size="16" />
                                            </v-avatar>
                                            <span class="text-subtitle-1 font-weight-medium">
                                                {{ t(`applications.language.options.${code}`) }}
                                            </span>
                                        </div>
                                    </v-sheet>
                                </v-item>
                            </v-col>
                        </v-item-group>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<style scoped>
.language-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
