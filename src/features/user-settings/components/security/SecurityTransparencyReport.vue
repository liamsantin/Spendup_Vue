<script setup lang="ts">
/**
 * Registre de transparence (`useTransparency`) : fenêtre et génération, compteur d’interventions
 * humaines, répartition par catégorie, résumé par mois, consultations, visites de la console.
 * Même registre pour tous les utilisateurs : ni nom, ni raison.
 */
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { useTransparency } from '@/features/user-settings/composables/useTransparency';

const { t } = useI18n();

const transparency = useTransparency();

/** Carré du badge de nature de visite : bleu si une consultation a été ouverte, gris sinon, filet si rien. */
function visitKindColor(kind: string): string {
    if (kind === 'consultation') return 'var(--blue)';
    if (kind === 'statistics') return 'var(--gray)';
    return 'var(--line)';
}
</script>

<template>
    <div class="transparency">
        <p class="transparency__intro">{{ t('security.transparency.intro') }}</p>

        <AppAlert v-if="transparency.error" type="error" class="su-alert" closable @dismiss="transparency.error = null">
            {{ transparency.error }}
        </AppAlert>

        <div v-if="transparency.loading && !transparency.report" class="su-loading" data-test="transparency-loading">
            <span class="su-spin" />
        </div>

        <template v-else-if="transparency.report">
            <!-- En-tête : fenêtre couverte et heure de génération, sur filet 2 px. -->
            <div class="transparency__window" data-test="transparency-window">
                <p class="transparency__window-range">{{ transparency.windowText }}</p>
                <p class="transparency__window-generated">{{ transparency.generatedAtText }}</p>
            </div>

            <div class="transparency__grid">
                <!-- Compteur d’interventions humaines : chiffre clé, « indisponible » jamais 0. -->
                <section class="su-section transparency__counter" data-test="transparency-counter">
                    <div class="su-section__head">
                        <h2>{{ t('security.transparency.counter.title') }}</h2>
                    </div>
                    <div class="su-fig">
                        <p class="su-fig__num" :class="{ 'transparency__counter-num--unavailable': !transparency.counterAvailable }">
                            {{ transparency.counterText }}
                        </p>
                        <p class="su-fig__label">{{ t('security.transparency.counter.label') }}</p>
                        <p class="su-fig__note">
                            {{
                                transparency.counterAvailable
                                    ? transparency.counterUpdatedAtText
                                    : t('security.transparency.counter.noUpdate')
                            }}
                        </p>
                    </div>
                    <p class="transparency__note">{{ t('security.transparency.counter.note') }}</p>
                </section>

                <!-- Répartition par catégorie : lignes libellé / valeur, les cinq catégories toujours présentes. -->
                <section class="su-section transparency__categories" data-test="transparency-categories">
                    <div class="su-section__head">
                        <h2>{{ t('security.transparency.byCategory.title') }}</h2>
                        <p>
                            {{
                                t(
                                    'security.transparency.byCategory.total',
                                    { n: transparency.consultationsTotal },
                                    transparency.consultationsTotal
                                )
                            }}
                        </p>
                    </div>
                    <div
                        v-for="row in transparency.byCategory"
                        :key="row.category"
                        class="su-kv"
                        :class="{ 'su-kv--strong': row.count > 0 }"
                    >
                        <span>{{ row.categoryText }}</span>
                        <span>{{ row.countText }}</span>
                    </div>
                </section>
            </div>

            <!-- Résumé par mois. -->
            <section class="su-section transparency__section" data-test="transparency-months">
                <div class="su-section__head">
                    <h2>{{ t('security.transparency.months.title') }}</h2>
                </div>
                <p v-if="!transparency.months.length" class="transparency__empty">{{ t('security.transparency.months.empty') }}</p>
                <div v-else class="su-table-wrap">
                    <table class="su-table">
                        <thead>
                            <tr>
                                <th>{{ t('security.transparency.months.month') }}</th>
                                <th class="is-num">{{ t('security.transparency.months.consoleVisits') }}</th>
                                <th class="is-num">{{ t('security.transparency.months.consultations') }}</th>
                                <th class="is-num">{{ t('security.transparency.months.usersConsulted') }}</th>
                                <th class="is-num">{{ t('security.transparency.months.loginsRefused') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in transparency.months" :key="row.month">
                                <td class="transparency__cell-strong">{{ row.monthText }}</td>
                                <td class="is-num">{{ row.consoleVisits }}</td>
                                <td class="is-num">{{ row.consultations }}</td>
                                <td class="is-num">{{ row.usersConsulted }}</td>
                                <td class="is-num">{{ row.loginsRefused }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- Consultations de données (anonymisées). -->
            <section class="su-section transparency__section" data-test="transparency-consultations">
                <div class="su-section__head">
                    <h2>{{ t('security.transparency.consultations.title') }}</h2>
                </div>
                <p v-if="!transparency.consultations.length" class="transparency__empty">
                    {{ t('security.transparency.consultations.empty') }}
                </p>
                <div v-else class="su-table-wrap">
                    <table class="su-table">
                        <thead>
                            <tr>
                                <th>{{ t('security.transparency.consultations.day') }}</th>
                                <th>{{ t('security.transparency.consultations.category') }}</th>
                                <th class="is-num">{{ t('security.transparency.consultations.duration') }}</th>
                                <th>{{ t('security.transparency.consultations.code') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in transparency.consultations" :key="row.key">
                                <td>{{ row.dayText }}</td>
                                <td>{{ row.categoryText }}</td>
                                <td class="is-num">{{ row.durationText }}</td>
                                <td>
                                    <span class="su-chip" :style="{ '--chip-color': row.codeUsed ? 'var(--blue)' : 'var(--line)' }">
                                        {{ row.codeText }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- Visites de la console d’administration. -->
            <section class="su-section transparency__section" data-test="transparency-visits">
                <div class="su-section__head">
                    <h2>{{ t('security.transparency.visits.title') }}</h2>
                </div>
                <p v-if="!transparency.visits.length" class="transparency__empty">{{ t('security.transparency.visits.empty') }}</p>
                <div v-else class="su-table-wrap">
                    <table class="su-table">
                        <thead>
                            <tr>
                                <th>{{ t('security.transparency.visits.day') }}</th>
                                <th class="is-num">{{ t('security.transparency.visits.duration') }}</th>
                                <th>{{ t('security.transparency.visits.kind') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in transparency.visits" :key="row.key">
                                <td>{{ row.dayText }}</td>
                                <td class="is-num">{{ row.durationText }}</td>
                                <td>
                                    <span class="su-chip" :style="{ '--chip-color': visitKindColor(row.kind) }">{{ row.kindText }}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </template>
    </div>
</template>

<style scoped>
.transparency__intro {
    margin: 0 0 24px;
    max-width: 72ch;
    color: var(--gray);
    font-size: 14px;
    line-height: 1.5;
}

/* Fenêtre et génération : une ligne sur filet 2 px. */
.transparency__window {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 4px 24px;
    padding: 12px 0;
    border-top: 2px solid var(--ink);
    border-bottom: 1px solid var(--line);
}

.transparency__window-range {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
}

.transparency__window-generated {
    margin: 0;
    color: var(--gray);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
}

.transparency__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 32px;
    margin-top: 32px;
}

.transparency__section {
    margin-top: var(--section-gap, 56px);
}

.transparency__counter .su-fig__num {
    font-size: 40px;
}

/* « indisponible » : en gris et en 400, jamais confondu avec un zéro. */
.transparency__counter-num--unavailable {
    color: var(--gray);
    font-weight: 400;
    letter-spacing: -0.02em;
}

.transparency__note {
    margin: 16px 0 0;
    max-width: 48ch;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.45;
}

.transparency__categories .su-kv:first-of-type {
    border-top: 0;
}

.transparency__cell-strong {
    font-weight: 700;
}

.transparency__empty {
    margin: 0;
    padding: 12px 0;
    color: var(--gray);
    font-size: 14px;
}

@media (max-width: 767px) {
    .transparency__grid {
        grid-template-columns: minmax(0, 1fr);
    }

    .transparency__categories {
        margin-top: 40px;
    }
}
</style>
