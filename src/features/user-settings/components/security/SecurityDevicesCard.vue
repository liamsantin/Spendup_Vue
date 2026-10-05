<script setup lang="ts">
/**
 * Carte appareils de session — UI branchée sur `useSecurityDevices`
 * (liste, confiance, révocation unitaire / globale, détails).
 */
import { DeviceLaptopIcon, DeviceMobileIcon, DotsVerticalIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { useSecurityDevices } from '@/features/user-settings/composables/useSecurityDevices';

const emit = defineEmits<{
    success: [message: string];
}>();

const { t } = useI18n();

/** État + actions appareils ; les succès remontent via `emit('success')`. */
const devices = useSecurityDevices({
    onSuccess: (message) => emit('success', message)
});
</script>

<template>
    <AppGlassCard :title="t('security.devices.title')" :subtitle="t('security.devices.subtitle')">
        <template #icon>
            <DeviceLaptopIcon :size="20" stroke-width="1.5" />
        </template>
        <template #actions>
            <button
                type="button"
                class="su-btn su-btn--danger"
                :disabled="devices.devicesLoading || devices.devices.length === 0 || devices.revokeAllLoading"
                @click="devices.revokeAllOpen = true"
            >
                {{ t('security.devices.revokeAll') }}
            </button>
        </template>
        <AppAlert v-if="devices.devicesError" type="error" class="su-alert" closable @dismiss="devices.devicesError = null">
            {{ devices.devicesError }}
        </AppAlert>

        <div class="mt-2">
            <div v-if="devices.devicesLoading" class="su-loading">
                <span class="su-spin" />
            </div>

            <div v-else-if="devices.devices.length === 0" class="su-empty">
                {{ t('security.devices.empty') }}
            </div>

            <template v-else>
                <template v-for="(device, index) in devices.devices" :key="device.deviceIdentifier">
                    <v-divider v-if="index > 0" />
                    <div class="d-flex align-start my-4">
                        <v-avatar size="30" rounded="md" color="surface" class="mt-1 flex-shrink-0">
                            <DeviceMobileIcon v-if="devices.isMobileDevice(device)" size="25" />
                            <DeviceLaptopIcon v-else size="25" />
                        </v-avatar>
                        <div class="ml-3 pr-2 flex-grow-1" style="min-width: 0">
                            <div class="d-flex align-center flex-wrap ga-2 mb-2">
                                <h6 class="text-h6 mb-0 text-truncate">
                                    {{ device.deviceName || t('security.devices.fallbackName') }}
                                </h6>
                                <v-chip v-if="devices.isCurrentDevice(device)" size="x-small" color="primary" variant="tonal">
                                    {{ t('security.devices.chips.current') }}
                                </v-chip>
                                <v-chip v-if="devices.isDeviceTrusted(device)" size="x-small" color="success" variant="tonal">
                                    {{ t('security.devices.chips.trusted') }}
                                </v-chip>
                            </div>
                            <div
                                v-for="row in devices.deviceSummaryRows(device)"
                                :key="`${device.deviceIdentifier}-${row.label}`"
                                class="text-subtitle-2 text-medium-emphasis mb-1"
                            >
                                <span class="font-weight-medium textPrimary">{{ row.label }} :</span>
                                {{ row.value }}
                            </div>
                        </div>
                        <v-menu location="bottom end">
                            <template #activator="{ props: menuProps }">
                                <button
                                    type="button"
                                    class="su-orb"
                                    v-bind="menuProps"
                                    :disabled="
                                        devices.revokeLoadingId === device.deviceIdentifier ||
                                        devices.trustLoadingId === device.deviceIdentifier
                                    "
                                    :aria-label="t('common.more')"
                                >
                                    <DotsVerticalIcon :size="18" stroke-width="1.75" />
                                </button>
                            </template>
                            <v-list density="compact" min-width="200">
                                <v-list-item :title="t('security.devices.menu.viewDetails')" @click="devices.openDeviceDetails(device)" />
                                <v-list-item
                                    v-if="!devices.isDeviceTrusted(device)"
                                    :title="t('security.devices.menu.trust')"
                                    @click="devices.setDeviceTrust(device, true)"
                                />
                                <v-list-item
                                    v-else
                                    :title="t('security.devices.menu.untrust')"
                                    @click="devices.setDeviceTrust(device, false)"
                                />
                                <v-list-item :title="t('security.devices.menu.disconnect')" @click="devices.openRevokeDevice(device)" />
                            </v-list>
                        </v-menu>
                    </div>
                </template>
            </template>
        </div>
    </AppGlassCard>

    <AppConfirmationModal
        v-model="devices.revokeAllOpen"
        :title="t('security.devices.revokeAllModal.title')"
        :message="t('security.devices.revokeAllModal.body')"
        :confirm-label="t('security.devices.revokeAllModal.confirm')"
        confirm-color="error"
        :loading="devices.revokeAllLoading"
        @confirm="devices.confirmRevokeAll"
    />

    <AppConfirmationModal
        :model-value="devices.revokeOpen"
        :title="t('security.devices.revokeModal.title')"
        :message="
            devices.revokeTarget && devices.isCurrentDevice(devices.revokeTarget)
                ? t('security.devices.revokeModal.bodyCurrent')
                : t('security.devices.revokeModal.body')
        "
        :confirm-label="t('security.devices.revokeModal.confirm')"
        confirm-color="error"
        :loading="!!devices.revokeLoadingId"
        @update:model-value="devices.onRevokeOpenChange"
        @confirm="devices.confirmRevokeDevice"
    />

    <AppModalBase
        :model-value="devices.detailsOpen"
        :title="devices.detailsTitle"
        :subtitle="
            devices.detailsDevice && devices.isCurrentDevice(devices.detailsDevice)
                ? t('security.devices.details.currentSubtitle')
                : undefined
        "
        :max-width="480"
        :height="520"
        @update:model-value="devices.onDetailsOpenChange"
    >
        <div v-if="devices.detailsRows.length === 0" class="text-body-1 text-medium-emphasis">
            {{ t('security.devices.details.empty') }}
        </div>
        <div v-else class="d-flex flex-column ga-3">
            <div v-for="row in devices.detailsRows" :key="row.label">
                <div class="text-subtitle-2 text-medium-emphasis mb-1">{{ row.label }}</div>
                <div class="text-body-1 text-break">{{ row.value }}</div>
            </div>
        </div>

        <template #footer="{ close }">
            <button
                v-if="devices.detailsDevice && !devices.isDeviceTrusted(devices.detailsDevice)"
                type="button"
                class="su-btn su-btn--ghost"
                :disabled="devices.trustLoadingId === devices.detailsDevice.deviceIdentifier"
                @click="devices.setDeviceTrust(devices.detailsDevice, true)"
            >
                {{ t('security.devices.details.trust') }}
            </button>
            <button
                v-else-if="devices.detailsDevice"
                type="button"
                class="su-btn su-btn--ghost"
                :disabled="devices.trustLoadingId === devices.detailsDevice.deviceIdentifier"
                @click="devices.setDeviceTrust(devices.detailsDevice, false)"
            >
                {{ t('security.devices.details.untrust') }}
            </button>
            <button type="button" class="su-btn su-btn--ink" @click="close">{{ t('security.devices.details.close') }}</button>
        </template>
    </AppModalBase>
</template>
