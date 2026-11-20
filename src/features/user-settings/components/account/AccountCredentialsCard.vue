<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { PencilIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';

defineProps<{
    username: string;
    email: string;
    pendingEmail: string | null;
    showPasswordField: boolean;
    canUnlinkGoogle: boolean;
    success: string | null;
    error: string | null;
}>();

const emit = defineEmits<{
    editUsername: [];
    editEmail: [];
    editPassword: [];
    unlinkGoogle: [];
    confirmPendingEmail: [];
    dismissSuccess: [];
    dismissError: [];
}>();

const { t } = useI18n();
</script>

<template>
    <section class="su-settings account-credentials">
        <div class="su-settings__lead">
            <h2>{{ t('accounts.credentials.title') }}</h2>
            <p>{{ t('accounts.credentials.hint') }}</p>
        </div>
        <div class="su-settings__fields">
            <AppAlert v-if="success" type="success" class="is-full su-alert" closable :dismiss-ms="5000" @dismiss="emit('dismissSuccess')">
                {{ success }}
            </AppAlert>
            <AppAlert v-if="error" type="error" class="is-full su-alert" closable @dismiss="emit('dismissError')">
                {{ error }}
            </AppAlert>
            <AppAlert v-if="pendingEmail" type="warning" class="is-full su-alert">
                {{ t('accounts.credentials.pendingEmail', { email: pendingEmail }) }}
                <button type="button" class="su-btn su-btn--warn su-btn--sm ml-1" @click="emit('confirmPendingEmail')">
                    {{ t('accounts.credentials.enterCode') }}
                </button>
            </AppAlert>

            <!-- Champs en lecture seule sur fond `--soft`, crayon à droite : tout le champ ouvre la modale. -->
            <div class="su-field">
                <span id="account-credential-username" class="su-field__label">{{ t('accounts.credentials.fields.username') }}</span>
                <button
                    type="button"
                    class="account-credentials__field"
                    aria-labelledby="account-credential-username"
                    @click="emit('editUsername')"
                >
                    <span class="account-credentials__value">{{ username }}</span>
                    <span class="su-orb account-credentials__pen" aria-hidden="true">
                        <PencilIcon :size="18" stroke-width="1.5" />
                    </span>
                </button>
            </div>
            <div class="su-field">
                <span id="account-credential-email" class="su-field__label">{{ t('accounts.credentials.fields.email') }}</span>
                <button
                    type="button"
                    class="account-credentials__field"
                    aria-labelledby="account-credential-email"
                    @click="emit('editEmail')"
                >
                    <span class="account-credentials__value">{{ email }}</span>
                    <span class="su-orb account-credentials__pen" aria-hidden="true">
                        <PencilIcon :size="18" stroke-width="1.5" />
                    </span>
                </button>
            </div>
            <div v-if="showPasswordField" class="su-field">
                <span id="account-credential-password" class="su-field__label">{{ t('accounts.credentials.fields.password') }}</span>
                <button
                    type="button"
                    class="account-credentials__field"
                    aria-labelledby="account-credential-password"
                    @click="emit('editPassword')"
                >
                    <span class="account-credentials__value">••••••••</span>
                    <span class="su-orb account-credentials__pen" aria-hidden="true">
                        <PencilIcon :size="18" stroke-width="1.5" />
                    </span>
                </button>
            </div>

            <div v-if="canUnlinkGoogle" class="is-full account-credentials__google">
                <span>{{ t('accounts.credentials.googleLinked') }}</span>
                <button type="button" class="su-btn su-btn--danger" @click="emit('unlinkGoogle')">
                    {{ t('accounts.credentials.unlinkGoogle') }}
                </button>
            </div>
        </div>
    </section>
</template>

<style scoped>
.account-credentials__field {
    appearance: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    min-height: 42px;
    padding: 0 2px 0 14px;
    border: 0;
    border-radius: 0;
    background: var(--soft);
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s var(--ease);
}

.account-credentials__field:hover {
    background: var(--line);
}

.account-credentials__field:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.account-credentials__value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.account-credentials__pen {
    width: 38px;
    height: 38px;
    color: var(--gray);
}

.account-credentials__field:hover .account-credentials__pen {
    background: transparent;
    color: var(--ink);
}

.account-credentials__google {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    color: var(--gray);
    font-size: 14px;
}
</style>
