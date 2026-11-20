<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';

defineProps<{
    enabled: boolean;
    successMessage: string | null;
}>();

const emit = defineEmits<{
    enable: [];
    disable: [];
    dismissSuccess: [];
}>();

const { t } = useI18n();
</script>

<template>
    <section class="su-settings security-two-factor">
        <div class="su-settings__lead">
            <h2>{{ t('security.twoFactor.title') }}</h2>
            <p>{{ t('security.twoFactor.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <AppAlert
                v-if="successMessage"
                type="success"
                class="is-full su-alert"
                closable
                :dismiss-ms="5000"
                @dismiss="emit('dismissSuccess')"
            >
                {{ successMessage }}
            </AppAlert>
            <!-- État = petit carré (bleu actif, gris inactif) + texte ; action principale à droite. -->
            <div class="is-full security-two-factor__row">
                <div class="security-two-factor__text">
                    <span class="su-chip" :style="{ '--chip-color': enabled ? 'var(--blue)' : 'var(--gray)' }">
                        {{ enabled ? t('security.twoFactor.status.enabled') : t('security.twoFactor.status.disabled') }}
                    </span>
                    <p>{{ t('security.twoFactor.description') }}</p>
                </div>
                <button v-if="!enabled" type="button" class="su-btn su-btn--ink" @click="emit('enable')">
                    {{ t('security.twoFactor.enable') }}
                </button>
                <button v-else type="button" class="su-btn su-btn--danger" @click="emit('disable')">
                    {{ t('security.twoFactor.disable') }}
                </button>
            </div>
        </div>
    </section>
</template>

<style scoped>
.security-two-factor__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 24px;
}

.security-two-factor__text {
    flex: 1 1 24ch;
    min-width: 0;
}

.security-two-factor__text p {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 14px;
    line-height: 1.45;
}

.security-two-factor__row .su-btn {
    flex: none;
}
</style>
