<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ClockHour4Icon } from 'vue-tabler-icons';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
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
    <AppGlassCard :title="t('security.session.title')" :subtitle="t('security.session.subtitle')">
        <template #icon>
            <ClockHour4Icon :size="20" stroke-width="1.5" />
        </template>
        <v-row>
            <v-col cols="12">
                <AppSwitch
                    :model-value="idleEnabled"
                    :label="t('security.session.idleLogoutEnabled')"
                    @update:model-value="onIdleToggle"
                />
                <div class="text-subtitle-2 text-medium-emphasis mt-1">
                    {{ t('security.session.idleLogoutHint') }}
                </div>
            </v-col>
            <v-col cols="12" md="6">
                <v-label class="mb-2 font-weight-medium">{{ t('security.session.idleLogoutMinutes') }}</v-label>
                <v-text-field
                    v-model.number="draft.idleLogoutMinutes"
                    type="number"
                    :min="IDLE_LOGOUT_MINUTES_MIN"
                    :max="IDLE_LOGOUT_MINUTES_MAX"
                    variant="outlined"
                    :hint="t('security.session.idleLogoutRange', { min: IDLE_LOGOUT_MINUTES_MIN, max: IDLE_LOGOUT_MINUTES_MAX })"
                    persistent-hint
                    :disabled="!idleEnabled"
                    @blur="onIdleMinutesBlur"
                />
            </v-col>
            <v-col cols="12" md="6">
                <v-label class="mb-2 font-weight-medium">{{ t('security.session.trustedDeviceDurationDays') }}</v-label>
                <v-text-field
                    v-model.number="draft.trustedDeviceDurationDays"
                    type="number"
                    :min="TRUSTED_DEVICE_DAYS_MIN"
                    :max="TRUSTED_DEVICE_DAYS_MAX"
                    variant="outlined"
                    :hint="t('security.session.trustedDeviceHint')"
                    persistent-hint
                    @blur="onTrustedDaysBlur"
                />
            </v-col>
            <v-col cols="12">
                <AppSwitch
                    v-model="draft.require2faForSensitiveActions"
                    :disabled="require2faDisabled"
                    :label="t('security.session.require2faForSensitiveActions')"
                />
                <div class="text-subtitle-2 text-medium-emphasis mt-1">
                    {{ require2faDisabled ? t('security.session.require2faNeedsTwoFactor') : t('security.session.require2faHint') }}
                </div>
            </v-col>
        </v-row>
    </AppGlassCard>
</template>
