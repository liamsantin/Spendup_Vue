<script setup lang="ts">
/**
 * Sécurité → Accès techniques : liste paginée des consultations subies par l’utilisateur
 * (`useAccessLog`). Chaque accès = un bloc sur filet fin : ouverture, durée et catégorie,
 * état en badge, puis raison, écrans consultés, e-mail d’information et code d’assistance.
 */
import { useI18n } from 'vue-i18n';
import { ShieldCheckIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { useAccessLog } from '@/features/user-settings/composables/useAccessLog';

const { t } = useI18n();

const accessLog = useAccessLog();
</script>

<template>
    <div class="access-log">
        <p class="access-log__intro">{{ t('security.accessLog.intro') }}</p>

        <AppAlert v-if="accessLog.error" type="error" class="su-alert" closable @dismiss="accessLog.error = null">
            {{ accessLog.error }}
        </AppAlert>

        <div v-if="accessLog.loading && !accessLog.rows.length" class="su-loading" data-test="access-log-loading">
            <span class="su-spin" />
        </div>

        <div v-else-if="accessLog.isEmpty" class="su-empty" data-test="access-log-empty">
            <span class="su-empty__mark"><ShieldCheckIcon :size="24" stroke-width="1.5" /></span>
            {{ t('security.accessLog.empty') }}
        </div>

        <template v-else-if="accessLog.rows.length">
            <ol class="access-log__list" :aria-busy="accessLog.loading">
                <li v-for="row in accessLog.rows" :key="row.id" class="access-log-entry" data-test="access-log-entry">
                    <div class="access-log-entry__head">
                        <div class="access-log-entry__when">
                            <p class="access-log-entry__date">{{ row.openedAtText }}</p>
                            <p class="access-log-entry__meta">{{ row.durationText }} · {{ row.categoryText }}</p>
                        </div>
                        <!-- État : petit carré coloré (bleu en cours, violet annulée, gris sinon) + libellé. -->
                        <span
                            class="su-chip access-log-entry__status"
                            :style="{ '--chip-color': row.statusColor }"
                            data-test="access-log-status"
                        >
                            {{ row.statusText }}
                        </span>
                    </div>
                    <dl class="access-log-entry__facts">
                        <div class="access-log-entry__fact access-log-entry__fact--wide">
                            <dt>{{ t('security.accessLog.fields.reason') }}</dt>
                            <dd class="access-log-entry__reason">{{ row.reason }}</dd>
                        </div>
                        <div class="access-log-entry__fact access-log-entry__fact--wide">
                            <dt>{{ t('security.accessLog.fields.views') }}</dt>
                            <dd>{{ row.viewsText }}</dd>
                        </div>
                        <div class="access-log-entry__fact">
                            <dt>{{ t('security.accessLog.fields.email') }}</dt>
                            <dd :class="{ 'access-log-entry__muted': !row.emailSent }">{{ row.emailText }}</dd>
                        </div>
                        <div v-if="row.codeUsed" class="access-log-entry__fact">
                            <dt>{{ t('security.accessLog.fields.code') }}</dt>
                            <dd>
                                <span class="su-chip" style="--chip-color: var(--blue)">{{ t('security.accessLog.codeUsed') }}</span>
                            </dd>
                        </div>
                    </dl>
                </li>
            </ol>

            <nav class="access-log__pagination" :aria-label="t('security.accessLog.pagination.label')">
                <span class="access-log__pagination-summary">{{ accessLog.paginationText }}</span>
                <div class="access-log__pagination-actions">
                    <button
                        type="button"
                        class="su-btn su-btn--ghost su-btn--sm"
                        :disabled="!accessLog.hasPrevious || accessLog.loading"
                        @click="accessLog.previous"
                    >
                        {{ t('security.accessLog.pagination.previous') }}
                    </button>
                    <button
                        type="button"
                        class="su-btn su-btn--ghost su-btn--sm"
                        :disabled="!accessLog.hasNext || accessLog.loading"
                        @click="accessLog.next"
                    >
                        {{ t('security.accessLog.pagination.next') }}
                    </button>
                </div>
            </nav>
        </template>
    </div>
</template>

<style scoped>
.access-log__intro {
    margin: 0 0 24px;
    max-width: 72ch;
    color: var(--gray);
    font-size: 14px;
    line-height: 1.5;
}

.access-log__list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 2px solid var(--ink);
}

.access-log__list[aria-busy='true'] {
    opacity: 0.6;
}

/* Un accès = un bloc sur filet fin ; pas de carte. */
.access-log-entry {
    padding: 16px 0 20px;
    border-bottom: 1px solid var(--line);
}

.access-log-entry__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 24px;
}

.access-log-entry__when {
    min-width: 0;
}

.access-log-entry__date {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
}

.access-log-entry__meta {
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
}

.access-log-entry__status {
    flex: none;
    height: auto;
    white-space: normal;
}

.access-log-entry__facts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 32px;
    margin: 14px 0 0;
}

.access-log-entry__fact--wide {
    grid-column: 1 / -1;
}

.access-log-entry__fact dt {
    margin: 0 0 2px;
    color: var(--gray);
    font-size: 13px;
}

.access-log-entry__fact dd {
    margin: 0;
    font-size: 14px;
    line-height: 1.45;
    font-variant-numeric: tabular-nums;
}

.access-log-entry__reason {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.access-log-entry__muted {
    color: var(--gray);
}

.access-log__pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 24px;
    padding-top: 16px;
}

.access-log__pagination-summary {
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.access-log__pagination-actions {
    display: flex;
    gap: 8px;
}

@media (max-width: 767px) {
    .access-log-entry__facts {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
