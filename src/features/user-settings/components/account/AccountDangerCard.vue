<script setup lang="ts">
/**
 * Zone sensible du compte — CTA suppression (émet `delete` vers le parent / modal).
 */
import { useI18n } from 'vue-i18n';

defineEmits<{
    delete: [];
}>();

const { t } = useI18n();
</script>

<template>
    <section class="su-settings su-settings--danger account-danger">
        <div class="su-settings__lead">
            <h2>{{ t('accounts.danger.title') }}</h2>
            <p>{{ t('accounts.danger.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <!-- Encadré 1 px `--danger-line` : titre 700, texte gris, bouton danger à droite. -->
            <div class="is-full account-danger__box">
                <div class="account-danger__text">
                    <h3>{{ t('accounts.danger.deleteAccount') }}</h3>
                    <p>{{ t('accounts.danger.warning') }}</p>
                </div>
                <button type="button" class="su-btn su-btn--danger" @click="$emit('delete')">
                    {{ t('accounts.danger.deleteAccount') }}
                </button>
            </div>
        </div>
    </section>
</template>

<style scoped>
.account-danger__box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 24px;
    padding: 16px 20px;
    border: 1px solid var(--danger-line);
}

.account-danger__text {
    flex: 1 1 24ch;
    min-width: 0;
}

.account-danger__text h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.account-danger__text p {
    margin: 4px 0 0;
    color: var(--gray);
    font-size: 13px;
    line-height: 1.45;
}

.account-danger__box .su-btn {
    flex: none;
}
</style>
