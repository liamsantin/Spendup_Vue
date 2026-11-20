<script setup lang="ts">
/**
 * Section code d’assistance — UI branchée sur `useSupportCode`
 * (état courant, génération, affichage unique du code, copie).
 */
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { useSupportCode } from '@/features/user-settings/composables/useSupportCode';

const { t } = useI18n();

const supportCode = useSupportCode();
</script>

<template>
    <section class="su-settings security-support-code">
        <div class="su-settings__lead">
            <h2>{{ t('security.supportCode.title') }}</h2>
            <p>{{ t('security.supportCode.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <AppAlert v-if="supportCode.error" type="error" class="is-full su-alert" closable @dismiss="supportCode.error = null">
                {{ supportCode.error }}
            </AppAlert>

            <!-- État = petit carré (bleu actif, gris sinon) + texte ; action principale à droite. -->
            <div class="is-full security-support-code__row">
                <div class="security-support-code__text">
                    <div v-if="supportCode.statusLoading" class="su-loading security-support-code__loading">
                        <span class="su-spin" />
                    </div>
                    <span
                        v-else-if="supportCode.status"
                        class="su-chip security-support-code__status"
                        data-test="support-code-status"
                        :style="{ '--chip-color': supportCode.hasActiveCode ? 'var(--blue)' : 'var(--gray)' }"
                    >
                        {{ supportCode.statusText }}
                    </span>
                    <p>{{ t('security.supportCode.description') }}</p>
                </div>
                <button
                    type="button"
                    class="su-btn su-btn--ink"
                    data-test="support-code-generate"
                    :disabled="supportCode.generating || supportCode.statusLoading"
                    @click="supportCode.generate"
                >
                    {{ supportCode.generateLabel }}
                </button>
            </div>

            <!-- Code affiché une seule fois : grand, en chasse fixe, sur filet 2 px, avec copie et expiration. -->
            <div v-if="supportCode.generated" class="is-full security-support-code__reveal" role="status" aria-live="polite">
                <p class="security-support-code__label">{{ t('security.supportCode.codeLabel') }}</p>
                <div class="security-support-code__code-row">
                    <code class="security-support-code__code" data-test="support-code-value">{{ supportCode.generated.code }}</code>
                    <button type="button" class="su-btn" data-test="support-code-copy" @click="supportCode.copyCode">
                        {{ supportCode.copied ? t('security.supportCode.copied') : t('security.supportCode.copy') }}
                    </button>
                </div>
                <p class="security-support-code__expires">{{ supportCode.generatedExpiresText }}</p>
                <p class="security-support-code__warning">{{ t('security.supportCode.oneTimeWarning') }}</p>
            </div>
        </div>
    </section>
</template>

<style scoped>
.security-support-code__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 24px;
}

.security-support-code__text {
    flex: 1 1 24ch;
    min-width: 0;
}

.security-support-code__text p {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 14px;
    line-height: 1.45;
}

.security-support-code__loading {
    padding: 0;
    justify-content: flex-start;
}

.security-support-code__status {
    height: auto;
    white-space: normal;
}

.security-support-code__row .su-btn {
    flex: none;
}

/* Bloc de révélation : pas de carte, un filet 2 px au-dessus et de l’espace. */
.security-support-code__reveal {
    margin-top: 8px;
    padding-top: 16px;
    border-top: 2px solid var(--ink);
}

.security-support-code__label {
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--gray);
}

.security-support-code__code-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px 24px;
}

/* Le code en grand, chasse fixe, chiffres tabulaires ; sélectionnable d’un clic. */
.security-support-code__code {
    font-family: var(--font-mono);
    font-size: 40px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 0.08em;
    font-variant-numeric: tabular-nums;
    color: var(--ink);
    background: none;
    padding: 0;
    user-select: all;
}

.security-support-code__expires {
    margin: 12px 0 0;
    font-size: 14px;
    color: var(--ink);
}

.security-support-code__warning {
    margin: 4px 0 0;
    font-size: 14px;
    line-height: 1.45;
    color: var(--violet-ink);
}

@media (max-width: 767px) {
    .security-support-code__code {
        font-size: 32px;
    }
}
</style>
