<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import {
    IDLE_LOGOUT_MINUTES_DEFAULT,
    IDLE_LOGOUT_MINUTES_MAX,
    IDLE_LOGOUT_MINUTES_MIN,
    TRUSTED_DEVICE_DAYS_MAX,
    TRUSTED_DEVICE_DAYS_MIN,
    type UserSettings
} from '@/features/user-settings/types';

const draft = defineModel<UserSettings>({ required: true });
const props = defineProps<{
    twoFactorEnabled?: boolean;
}>();
const { t } = useI18n();

const idleEnabled = ref(false);

watch(
    () => draft.value.idleLogoutMinutes,
    (value) => {
        idleEnabled.value = value != null;
    },
    { immediate: true }
);

const require2faDisabled = computed(() => !props.twoFactorEnabled);

function onIdleToggle(enabled: boolean | null) {
    const on = !!enabled;
    idleEnabled.value = on;
    draft.value.idleLogoutMinutes = on ? clampIdle(draft.value.idleLogoutMinutes ?? IDLE_LOGOUT_MINUTES_DEFAULT) : null;
}

function clampIdle(value: number): number {
    if (!Number.isFinite(value)) return IDLE_LOGOUT_MINUTES_DEFAULT;
    return Math.min(IDLE_LOGOUT_MINUTES_MAX, Math.max(IDLE_LOGOUT_MINUTES_MIN, Math.round(value)));
}

function onIdleMinutesBlur() {
    if (!idleEnabled.value || draft.value.idleLogoutMinutes == null) return;
    draft.value.idleLogoutMinutes = clampIdle(draft.value.idleLogoutMinutes);
}

function onTrustedDaysBlur() {
    const value = draft.value.trustedDeviceDurationDays;
    if (!Number.isFinite(value)) {
        draft.value.trustedDeviceDurationDays = 30;
        return;
    }
    draft.value.trustedDeviceDurationDays = Math.min(TRUSTED_DEVICE_DAYS_MAX, Math.max(TRUSTED_DEVICE_DAYS_MIN, Math.round(value)));
}
</script>

<template>
    <section class="su-settings">
        <div class="su-settings__lead">
            <h2>{{ t('security.session.title') }}</h2>
            <p>{{ t('security.session.subtitle') }}</p>
        </div>
        <div class="su-settings__fields">
            <div class="is-full">
                <div class="su-switch-row">
                    <div class="su-switch-row__text">
                        <label class="su-switch-row__label" for="security-idle-enabled">{{
                            t('security.session.idleLogoutEnabled')
                        }}</label>
                        <p class="su-switch-row__hint">{{ t('security.session.idleLogoutHint') }}</p>
                    </div>
                    <AppSwitch id="security-idle-enabled" :model-value="idleEnabled" @update:model-value="onIdleToggle" />
                </div>
            </div>
            <div class="su-field">
                <label class="su-field__label" for="security-idle-minutes">{{ t('security.session.idleLogoutMinutes') }}</label>
                <v-text-field
                    id="security-idle-minutes"
                    v-model.number="draft.idleLogoutMinutes"
                    type="number"
                    :min="IDLE_LOGOUT_MINUTES_MIN"
                    :max="IDLE_LOGOUT_MINUTES_MAX"
                    variant="outlined"
                    hide-details
                    :disabled="!idleEnabled"
                    @blur="onIdleMinutesBlur"
                />
                <p class="su-field__hint">
                    {{ t('security.session.idleLogoutRange', { min: IDLE_LOGOUT_MINUTES_MIN, max: IDLE_LOGOUT_MINUTES_MAX }) }}
                </p>
            </div>
            <div class="su-field">
                <label class="su-field__label" for="security-trusted-days">{{ t('security.session.trustedDeviceDurationDays') }}</label>
                <v-text-field
                    id="security-trusted-days"
                    v-model.number="draft.trustedDeviceDurationDays"
                    type="number"
                    :min="TRUSTED_DEVICE_DAYS_MIN"
                    :max="TRUSTED_DEVICE_DAYS_MAX"
                    variant="outlined"
                    hide-details
                    @blur="onTrustedDaysBlur"
                />
                <p class="su-field__hint">{{ t('security.session.trustedDeviceHint') }}</p>
            </div>
            <div class="is-full">
                <div class="su-switch-row">
                    <div class="su-switch-row__text">
                        <label class="su-switch-row__label" for="security-require-2fa">{{
                            t('security.session.require2faForSensitiveActions')
                        }}</label>
                        <p class="su-switch-row__hint">
                            {{ require2faDisabled ? t('security.session.require2faNeedsTwoFactor') : t('security.session.require2faHint') }}
                        </p>
                    </div>
                    <AppSwitch id="security-require-2fa" v-model="draft.require2faForSensitiveActions" :disabled="require2faDisabled" />
                </div>
            </div>
        </div>
    </section>
</template>
