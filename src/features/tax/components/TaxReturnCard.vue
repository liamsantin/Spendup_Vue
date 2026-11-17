<script setup lang="ts">
/** Carte d'une déclaration dans la liste : statut, avancement et menu d'actions. */
defineOptions({ name: 'TaxReturnCard' });

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    ArchiveIcon,
    ArrowRightIcon,
    CircleCheckIcon,
    CodeIcon,
    DotsIcon,
    ArrowBackUpIcon,
    FileTextIcon,
    PencilIcon,
    PlayerPlayIcon,
    ProgressCheckIcon,
    TableExportIcon,
    TrashIcon
} from 'vue-tabler-icons';
import type { TaxReturnListItem, TaxStatus } from '@/features/tax/types';

const props = defineProps<{
    item: TaxReturnListItem;
    saving: boolean;
}>();

const emit = defineEmits<{
    open: [];
    pdf: [];
    export: [format: 'csv' | 'json'];
    status: [status: TaxStatus];
    file: [];
    unfile: [];
    next: [];
    remove: [];
}>();

const { t } = useI18n();

function fillRatio(filled: number, total: number): string {
    if (total <= 0) return '0%';
    return `${Math.min(100, Math.round((filled / total) * 100))}%`;
}

/** L'année suivante s'ouvre au plus tard l'année civile qui la précède. */
const canCreateNext = computed(() => props.item.year + 1 <= new Date().getFullYear() + 1);

function onActivate(event: MouseEvent) {
    if (props.saving) return;
    if (event.target instanceof Element && event.target.closest('button')) return;
    emit('open');
}
</script>

<template>
    <article class="tax-card" role="button" tabindex="0" @click="onActivate" @keydown.enter.prevent="emit('open')">
        <div class="tax-card__head">
            <p class="tax-card__kicker">{{ item.canton }}</p>
            <div class="tax-card__actions" @click.stop>
                <v-menu location="bottom end" :offset="4">
                    <template #activator="{ props: menuProps }">
                        <button v-bind="menuProps" type="button" class="su-orb" :disabled="saving" :aria-label="t('common.more')">
                            <DotsIcon :size="18" stroke-width="1.75" />
                        </button>
                    </template>
                    <v-sheet class="su-menu tax-actions-menu">
                        <button type="button" class="su-menu-item" :disabled="saving" @click="emit('open')">
                            <span class="su-menu-item__icon"><PencilIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.open') }}</span>
                        </button>
                        <button type="button" class="su-menu-item" :disabled="saving" @click="emit('pdf')">
                            <span class="su-menu-item__icon"><FileTextIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.pdf') }}</span>
                        </button>
                        <button type="button" class="su-menu-item" :disabled="saving" @click="emit('export', 'csv')">
                            <span class="su-menu-item__icon"><TableExportIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.exportCsv') }}</span>
                        </button>
                        <button type="button" class="su-menu-item" :disabled="saving" @click="emit('export', 'json')">
                            <span class="su-menu-item__icon"><CodeIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.exportJson') }}</span>
                        </button>
                        <button v-if="canCreateNext" type="button" class="su-menu-item" :disabled="saving" @click="emit('next')">
                            <span class="su-menu-item__icon"><ArrowRightIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.nextYear', { year: item.year + 1 }) }}</span>
                        </button>
                        <button v-if="!item.locked" type="button" class="su-menu-item" :disabled="saving" @click="emit('file')">
                            <span class="su-menu-item__icon"><CircleCheckIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.file') }}</span>
                        </button>
                        <button v-if="item.locked" type="button" class="su-menu-item" :disabled="saving" @click="emit('unfile')">
                            <span class="su-menu-item__icon"><ArrowBackUpIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.unfile') }}</span>
                        </button>
                        <button
                            v-if="!item.locked && item.status !== 'preteARecopier'"
                            type="button"
                            class="su-menu-item"
                            :disabled="saving"
                            @click="emit('status', 'preteARecopier')"
                        >
                            <span class="su-menu-item__icon"><ProgressCheckIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.ready') }}</span>
                        </button>
                        <button
                            v-if="!item.locked && item.status !== 'enCours'"
                            type="button"
                            class="su-menu-item"
                            :disabled="saving"
                            @click="emit('status', 'enCours')"
                        >
                            <span class="su-menu-item__icon"><PlayerPlayIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.resume') }}</span>
                        </button>
                        <button
                            v-if="item.status !== 'archivee'"
                            type="button"
                            class="su-menu-item"
                            :disabled="saving"
                            @click="emit('status', 'archivee')"
                        >
                            <span class="su-menu-item__icon"><ArchiveIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.archive') }}</span>
                        </button>
                        <button type="button" class="su-menu-item tax-actions-menu__delete" :disabled="saving" @click="emit('remove')">
                            <span class="su-menu-item__icon su-menu-item__icon--danger"><TrashIcon :size="18" stroke-width="1.6" /></span>
                            <span class="su-menu-item__title">{{ t('taxPage.actions.delete') }}</span>
                        </button>
                    </v-sheet>
                </v-menu>
            </div>
        </div>
        <h3 class="tax-card__name">{{ item.name?.trim() ? `${item.name.trim()} · ${item.year}` : item.year }}</h3>
        <p class="tax-card__sub">{{ t(`taxPage.statuses.${item.status}`) }}</p>
        <div
            class="su-gauge tax-card__gauge"
            role="img"
            :aria-label="t('taxPage.filled', { filled: item.filledCount, total: item.lineCount }, item.filledCount)"
        >
            <span class="su-gauge__fill su-gauge__fill--blue" :style="{ width: fillRatio(item.filledCount, item.lineCount) }" />
        </div>
        <div v-if="item.checklistTotal > 0" class="su-kv">
            <span>{{ t('taxPage.checklist.count', { received: item.checklistReceived, total: item.checklistTotal }) }}</span>
        </div>
        <div class="su-kv su-kv--strong">
            <span>{{ t('taxPage.filled', { filled: item.filledCount, total: item.lineCount }, item.filledCount) }}</span>
            <span>{{ fillRatio(item.filledCount, item.lineCount) }}</span>
        </div>
    </article>
</template>
