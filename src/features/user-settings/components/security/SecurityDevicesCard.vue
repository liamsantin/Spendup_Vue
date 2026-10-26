<script setup lang="ts">
/**
 * Section appareils de session — UI branchée sur `useSecurityDevices`
 * (liste, confiance, révocation unitaire / globale, détails).
 */
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

/** État + actions appareils ; les succès remontent via `emit('success')`. */
const devices = useSecurityDevices({
    onSuccess: (message) => emit('success', message)
});
</script>

<template>
    <section class="su-settings security-devices">
        <div class="su-settings__lead">
            <h2>{{ t('security.devices.title') }}</h2>
            <p>{{ t('security.devices.subtitle') }}</p>
            <button
                type="button"
                class="su-btn su-btn--danger security-devices__revoke-all"
                :disabled="devices.devicesLoading || devices.devices.length === 0 || devices.revokeAllLoading"
                @click="devices.revokeAllOpen = true"
            >
                {{ t('security.devices.revokeAll') }}
            </button>
        </div>
        <div class="su-settings__fields">
            <AppAlert v-if="devices.devicesError" type="error" class="is-full su-alert" closable @dismiss="devices.devicesError = null">
                {{ devices.devicesError }}
            </AppAlert>

            <div class="is-full">
                <div v-if="devices.devicesLoading" class="su-loading">
                    <span class="su-spin" />
                </div>

                <div v-else-if="devices.devices.length === 0" class="su-empty">
                    {{ t('security.devices.empty') }}
                </div>

                <!-- Lignes `su-person` : pictogramme dans un carré 36 px teinté, nom 700, sous-ligne grise, menu `su-orb`. -->
                <div v-else class="security-devices__list">
                    <div v-for="device in devices.devices" :key="device.deviceIdentifier" class="su-person security-devices__row">
                        <span class="su-person__avatar su-person__avatar--tile">
                            <DeviceMobileIcon v-if="devices.isMobileDevice(device)" :size="18" stroke-width="1.6" />
                            <DeviceLaptopIcon v-else :size="18" stroke-width="1.6" />
                        </span>
                        <div class="su-person__meta">
                            <p class="su-person__name">
                                {{ device.deviceName || t('security.devices.fallbackName') }}
                                <span
                                    v-if="devices.isCurrentDevice(device)"
                                    class="su-chip security-devices__chip"
                                    style="--chip-color: var(--blue)"
                                >
                                    {{ t('security.devices.chips.current') }}
                                </span>
                                <span
                                    v-if="devices.isDeviceTrusted(device)"
                                    class="su-chip security-devices__chip"
                                    style="--chip-color: var(--violet)"
                                >
                                    {{ t('security.devices.chips.trusted') }}
                                </span>
                            </p>
                            <p class="su-person__sub">
                                <template
                                    v-for="(row, index) in devices.deviceSummaryRows(device)"
                                    :key="`${device.deviceIdentifier}-${row.label}`"
                                >
                                    <template v-if="index > 0"> · </template>{{ row.label }} : {{ row.value }}
                                </template>
                            </p>
                        </div>
                        <div class="su-person__actions">
                            <button type="button" class="su-btn su-btn--sm" @click="devices.openDeviceDetails(device)">
                                {{ t('security.devices.menu.viewDetails') }}
                            </button>
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
                                <v-list density="compact" min-width="220">
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
                                    <v-list-item :title="t('security.devices.menu.disconnect')" @click="devices.openRevokeDevice(device)" />
                                </v-list>
                            </v-menu>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

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
        <div v-if="devices.detailsRows.length === 0" class="security-devices__details-empty">
            {{ t('security.devices.details.empty') }}
        </div>
        <!-- Lignes libellé / valeur sur filets fins. -->
        <dl v-else class="security-devices__details">
            <div v-for="row in devices.detailsRows" :key="row.label" class="su-kv">
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
            </div>
        </dl>

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

<style scoped>
.security-devices__revoke-all {
    margin-top: 16px;
}

.security-devices__list {
    display: flex;
    flex-direction: column;
}

/* ligne statique (pas un bouton) : pas de curseur main */
.security-devices__row {
    cursor: default;
}

.security-devices__row:first-child {
    border-top: 0;
    padding-top: 0;
}

.security-devices__row .su-person__name {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 12px;
    white-space: normal;
}

.security-devices__chip {
    height: auto;
    font-size: 12.5px;
}

.security-devices__row .su-person__sub {
    white-space: normal;
}

.security-devices__details {
    margin: 0;
}

.security-devices__details dt,
.security-devices__details dd {
    margin: 0;
}

.security-devices__details dd {
    overflow-wrap: anywhere;
}

.security-devices__details-empty {
    color: var(--gray);
    font-size: 14px;
}

@media (max-width: 767px) {
    .security-devices__row {
        flex-wrap: wrap;
    }

    .security-devices__row .su-person__actions {
        width: 100%;
        justify-content: flex-start;
        padding-left: 50px;
    }
}
</style>
