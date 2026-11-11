<script setup lang="ts">
/**
 * Réglages « Documents sur cet ordinateur » (app de bureau) : dossier des PDF, synchro en ligne, compteur des
 * fichiers qui ne sont que sur ce poste. Appliqués tout de suite, hors du formulaire des préférences.
 */
defineOptions({ name: 'FileSyncSettings' });

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { formatStorageMo } from '@/features/files/format';
import { TRASH_RETENTION_DAYS, useFileSyncStore } from '@/features/files/sync/sync-store';

const { t } = useI18n();
const sync = useFileSyncStore();
const moving = ref(false);
const error = ref<string | null>(null);

const enabled = computed({
    get: () => sync.enabled,
    set: (value: boolean) => sync.setEnabled(value)
});

const localOnlyLabel = computed(() => {
    const bytes = sync.localOnlyHere.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0);
    return t(
        'filesPage.sync.panel.localOnly',
        { count: sync.localOnlyHere.length, size: t('filesPage.usage.mo', { n: formatStorageMo(bytes) }) },
        sync.localOnlyHere.length
    );
});

async function changeFolder() {
    moving.value = true;
    error.value = null;
    try {
        await sync.changeRoot();
    } catch (e: unknown) {
        error.value = getErrorMessage(e);
    } finally {
        moving.value = false;
    }
}
</script>

<template>
    <section v-if="sync.available" class="su-settings">
        <div class="su-settings__lead">
            <h2>{{ t('filesPage.sync.settings.title') }}</h2>
            <p>{{ t('filesPage.sync.settings.subtitle', { days: TRASH_RETENTION_DAYS }) }}</p>
        </div>
        <div class="su-settings__fields">
            <AppAlert v-if="error" type="error" class="su-alert is-full">{{ error }}</AppAlert>
            <AppAlert v-if="sync.pause === 'root_unavailable'" type="warning" class="su-alert is-full">
                {{ t('filesPage.sync.pause.root_unavailable') }}
            </AppAlert>
            <div class="is-full">
                <div class="su-switch-row">
                    <div class="su-switch-row__text">
                        <span class="su-switch-row__label">{{ t('filesPage.sync.settings.folder') }}</span>
                        <span class="su-switch-row__hint">{{ sync.root?.path ?? '—' }}</span>
                    </div>
                    <button type="button" class="su-btn su-btn--ghost" :disabled="moving" @click="changeFolder">
                        {{ moving ? t('filesPage.sync.settings.moving') : t('filesPage.sync.settings.change') }}
                    </button>
                </div>
            </div>
            <div class="is-full">
                <div class="su-switch-row">
                    <div class="su-switch-row__text">
                        <label class="su-switch-row__label" for="file-sync-enabled">{{ t('filesPage.sync.settings.enabled') }}</label>
                        <span class="su-switch-row__hint">{{ t('filesPage.sync.settings.enabledHint') }}</span>
                    </div>
                    <AppSwitch id="file-sync-enabled" v-model="enabled" />
                </div>
            </div>
            <p v-if="sync.localOnlyHere.length" class="is-full su-switch-row__hint">{{ localOnlyLabel }}</p>
        </div>
    </section>
</template>
