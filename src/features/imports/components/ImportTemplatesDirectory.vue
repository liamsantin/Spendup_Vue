<script setup lang="ts">
/** Modèles d’import : perso (renommer, activer, supprimer) puis modèles Spend.Up (lecture seule). */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import { getErrorMessage } from '@/utils/errors/app-error';
import { useTiersStore } from '@/features/tiers/stores/tiers-store';
import ImportTemplateListItem from '@/features/imports/components/list/ImportTemplateListItem.vue';
import ImportTemplateFormModal from '@/features/imports/components/modals/ImportTemplateFormModal.vue';
import { useImportsStore } from '@/features/imports/stores/imports-store';
import type { ImportTemplate } from '@/features/imports/types';

const { t } = useI18n();
const store = useImportsStore();
const tiersStore = useTiersStore();

const editTarget = ref<ImportTemplate | null>(null);
const deleteTarget = ref<ImportTemplate | null>(null);
const localError = ref<string | null>(null);

const editOpen = computed({
    get: () => !!editTarget.value,
    set: (value: boolean) => {
        if (!value) editTarget.value = null;
    }
});

const deleteOpen = computed({
    get: () => !!deleteTarget.value,
    set: (value: boolean) => {
        if (!value) deleteTarget.value = null;
    }
});

const personal = computed(() => store.templates.filter((item) => !item.isSystem));
const system = computed(() => store.templates.filter((item) => item.isSystem));

function bankName(template: ImportTemplate): string | null {
    return template.bankTierPublicId ? (tiersStore.findByPublicId(template.bankTierPublicId)?.name ?? null) : null;
}

onMounted(() => {
    localError.value = null;
    store.loadTemplates({ force: true }).catch((e: unknown) => {
        localError.value = getErrorMessage(e);
    });
});

async function toggleActive(template: ImportTemplate, value: boolean) {
    localError.value = null;
    try {
        await store.updateTemplate(template, { isActive: value });
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    }
}

async function confirmDelete() {
    const target = deleteTarget.value;
    if (!target) return;
    localError.value = null;
    try {
        await store.deleteTemplate(target.publicId);
    } catch (e: unknown) {
        localError.value = getErrorMessage(e);
    } finally {
        deleteTarget.value = null;
    }
}
</script>

<template>
    <div class="import-templates">
        <AppAlert
            v-if="localError || store.error"
            type="error"
            class="su-alert"
            closable
            @dismiss="
                localError = null;
                store.clearError();
            "
        >
            {{ localError || store.error }}
        </AppAlert>

        <div v-if="store.templatesLoading && !store.templates.length" class="su-loading">
            <span class="su-spin" />
        </div>
        <template v-else>
            <section class="import-templates__section">
                <h2 class="import-templates__title">{{ t('importsPage.templates.personal') }}</h2>
                <p v-if="!personal.length" class="import-templates__empty">{{ t('importsPage.templates.emptyPersonal') }}</p>
                <div v-else class="import-templates__list">
                    <ImportTemplateListItem
                        v-for="template in personal"
                        :key="template.publicId"
                        :template="template"
                        :bank-name="bankName(template)"
                        :acting="store.acting"
                        @edit="editTarget = $event"
                        @delete="deleteTarget = $event"
                        @toggle-active="toggleActive"
                    />
                </div>
            </section>
            <section v-if="system.length" class="import-templates__section">
                <h2 class="import-templates__title">{{ t('importsPage.templates.systemSection') }}</h2>
                <div class="import-templates__list">
                    <ImportTemplateListItem v-for="template in system" :key="template.publicId" :template="template" />
                </div>
            </section>
        </template>

        <ImportTemplateFormModal v-model="editOpen" :template="editTarget" />

        <AppConfirmationModal
            v-model="deleteOpen"
            :title="t('importsPage.templates.deleteModal.title')"
            :message="t('importsPage.templates.deleteModal.body', { name: deleteTarget?.name ?? '' })"
            :confirm-label="t('importsPage.actions.delete')"
            confirm-color="error"
            :loading="store.acting"
            @confirm="confirmDelete"
        />
    </div>
</template>

<style scoped>
.import-templates {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.import-templates__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.import-templates__title {
    margin: 0;
    padding: 6px 10px 2px;
    font-size: 0.78rem;
    font-weight: 650;
    letter-spacing: 0.02em;
    color: var(--ink-muted);
}

.import-templates__empty {
    margin: 0;
    padding: 6px 10px;
    font-size: 0.86rem;
    color: var(--ink-muted);
}

.import-templates__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
</style>
