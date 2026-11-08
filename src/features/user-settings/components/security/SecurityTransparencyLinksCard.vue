<script setup lang="ts">
/**
 * Section « Accès à vos données » de la page Sécurité : liens vers Accès techniques
 * (consultations subies par l’utilisateur) et Transparence (registre de l’opérateur).
 */
import { useI18n } from 'vue-i18n';
import { SECURITY_PATHS } from '@/features/user-settings/settings-paths';

const { t } = useI18n();
</script>

<template>
    <section class="su-settings security-links">
        <div class="su-settings__lead">
            <h2>{{ t('security.links.title') }}</h2>
            <p>{{ t('security.links.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <div class="is-full security-links__row">
                <div class="security-links__text">
                    <p class="security-links__name">{{ t('security.links.accessLog') }}</p>
                    <p class="security-links__hint">{{ t('security.links.accessLogHint') }}</p>
                </div>
                <RouterLink :to="SECURITY_PATHS.accessLog" class="su-link" data-test="security-link-access-log">
                    {{ t('security.links.open') }}
                </RouterLink>
            </div>
            <div class="is-full security-links__row">
                <div class="security-links__text">
                    <p class="security-links__name">{{ t('security.links.transparency') }}</p>
                    <p class="security-links__hint">{{ t('security.links.transparencyHint') }}</p>
                </div>
                <RouterLink :to="SECURITY_PATHS.transparency" class="su-link" data-test="security-link-transparency">
                    {{ t('security.links.open') }}
                </RouterLink>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* Une ligne par page : nom 700 + explication grise, lien « Ouvrir → » à droite, filet fin entre les lignes. */
.security-links__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px 24px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
}

.security-links__row:first-child {
    padding-top: 0;
    border-top: 0;
}

.security-links__text {
    flex: 1 1 24ch;
    min-width: 0;
}

.security-links__name {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
}

.security-links__hint {
    margin: 2px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.4;
}

.security-links__row .su-link {
    flex: none;
}
</style>
