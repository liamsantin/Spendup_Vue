<script setup lang="ts">
import { DeviceLaptopIcon, DeviceMobileIcon, DotsVerticalIcon } from 'vue-tabler-icons';
import { useI18n } from 'vue-i18n';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import { useSecurityDevices } from '@/features/user-settings/composables/useSecurityDevices';

const emit = defineEmits<{
    success: [message: string];
}>();

const { t } = useI18n();

const devices = useSecurityDevices({
    onSuccess: (message) => emit('success', message)
});
</script>

<template>
    <v-card elevation="10">
        <v-card-item>
            <div class="d-flex align-center ga-3 flex-wrap">
                <v-avatar size="48" rounded="md" color="lightprimary">
                    <DeviceLaptopIcon class="text-primary" size="25" />
                </v-avatar>
                <div>
                    <h4 class="text-h4 mb-0">{{ t('security.devices.title') }}</h4>
                </div>
            </div>
            <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">{{ t('security.devices.subtitle') }}</div>

            <AppAlert v-if="devices.devicesError" type="error" class="mt-4" closable @dismiss="devices.devicesError = null">
                {{ devices.devicesError }}
            </AppAlert>

            <v-btn
                color="primary"
                class="mt-2"
                flat
                :loading="devices.revokeAllLoading"
                :disabled="devices.devicesLoading || devices.devices.length === 0"
                @click="devices.revokeAllOpen = true"
            >
                {{ t('security.devices.revokeAll') }}
            </v-btn>

            <div class="mt-sm-8 mt-5">
                <div v-if="devices.devicesLoading" class="d-flex justify-center py-6">
                    <v-progress-circular indeterminate color="primary" size="28" />
                </div>

                <div v-else-if="devices.devices.length === 0" class="text-subtitle-1 text-medium-emphasis py-4">
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
                                    <v-btn
                                        size="30"
                                        icon
                                        variant="flat"
                                        class="lightprimary flex-shrink-0"
                                        :loading="
                                            devices.revokeLoadingId === device.deviceIdentifier ||
                                            devices.trustLoadingId === device.deviceIdentifier
                                        "
                                        v-bind="menuProps"
                                    >
                                        <v-avatar size="20">
                                            <DotsVerticalIcon />
                                        </v-avatar>
                                    </v-btn>
                                </template>
                                <v-list density="compact" min-width="200">
                                    <v-list-item
                                        :title="t('security.devices.menu.viewDetails')"
                                        @click="devices.openDeviceDetails(device)"
                                    />
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
                                    <v-list-item
                                        :title="t('security.devices.menu.disconnect')"
                                        @click="devices.openRevokeDevice(device)"
                                    />
                                </v-list>
                            </v-menu>
                        </div>
                    </template>
                </template>
            </div>
        </v-card-item>
    </v-card>

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
            <v-btn
                v-if="devices.detailsDevice && !devices.isDeviceTrusted(devices.detailsDevice)"
                color="primary"
                variant="tonal"
                flat
                :loading="devices.trustLoadingId === devices.detailsDevice.deviceIdentifier"
                @click="devices.setDeviceTrust(devices.detailsDevice, true)"
            >
                {{ t('security.devices.details.trust') }}
            </v-btn>
            <v-btn
                v-else-if="devices.detailsDevice"
                color="default"
                variant="tonal"
                flat
                :loading="devices.trustLoadingId === devices.detailsDevice.deviceIdentifier"
                @click="devices.setDeviceTrust(devices.detailsDevice, false)"
            >
                {{ t('security.devices.details.untrust') }}
            </v-btn>
            <v-spacer />
            <v-btn color="primary" flat @click="close">{{ t('security.devices.details.close') }}</v-btn>
        </template>
    </AppModalBase>
</template>
