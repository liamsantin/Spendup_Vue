<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { DeviceLaptopIcon, DeviceMobileIcon, DotsVerticalIcon, ShieldCheckIcon } from 'vue-tabler-icons';
import { getOrCreateDeviceId, useAuthStore, type AuthDevice } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';
import TwoFactorSetupDialog from './TwoFactorSetupDialog.vue';
import TwoFactorDisableDialog from './TwoFactorDisableDialog.vue';

const auth = useAuthStore();
const { t, locale } = useI18n();

const setupOpen = ref(false);
const disableOpen = ref(false);
const revokeAllOpen = ref(false);
const detailsOpen = ref(false);
const detailsDevice = ref<AuthDevice | null>(null);
const successMessage = ref<string | null>(null);
const devicesError = ref<string | null>(null);

const devices = ref<AuthDevice[]>([]);
const devicesLoading = ref(false);
const revokeLoadingId = ref<string | null>(null);
const trustLoadingId = ref<string | null>(null);
const revokeAllLoading = ref(false);

const currentDeviceId = getOrCreateDeviceId();
const twoFactorEnabled = computed(() => !!auth.user?.twoFactorEnabled);
const detailsTitle = computed(() => detailsDevice.value?.deviceName || t('security.devices.details.fallbackTitle'));
const detailsRows = computed(() => (detailsDevice.value ? deviceDetailRows(detailsDevice.value) : []));

type DeviceDetailRow = { label: string; value: string };

const dateFormatter = computed(
    () =>
        new Intl.DateTimeFormat(locale.value, {
            dateStyle: 'medium',
            timeStyle: 'short'
        })
);

const KNOWN_RAW_KEYS = new Set([
    'deviceIdentifier',
    'device_identifier',
    'DeviceIdentifier',
    'id_devices',
    'idDevices',
    'IdDevices',
    'id',
    'deviceName',
    'device_name',
    'DeviceName',
    'name',
    'Name',
    'deviceType',
    'device_type',
    'DeviceType',
    'browser',
    'Browser',
    'os',
    'Os',
    'operatingSystem',
    'operating_system',
    'OperatingSystem',
    'ipAddress',
    'ip_address',
    'last_ip_address',
    'lastIpAddress',
    'IpAddress',
    'ip',
    'country',
    'last_country',
    'lastCountry',
    'Country',
    'city',
    'City',
    'region',
    'Region',
    'createdAt',
    'created_at',
    'CreatedAt',
    'firstSeenAt',
    'first_seen_at',
    'FirstSeenAt',
    'lastSeenAt',
    'last_seen_at',
    'LastSeenAt',
    'lastActiveAt',
    'last_active_at',
    'LastActiveAt',
    'userAgent',
    'user_agent',
    'UserAgent',
    'sessionCount',
    'active_sessions_count',
    'activeSessionsCount',
    'SessionCount',
    'isTrusted',
    'is_trusted',
    'IsTrusted',
    'isCurrentDevice',
    'is_current_device',
    'IsCurrentDevice',
    'is_hidden',
    'isHidden',
    'IsHidden'
]);

function formatDeviceDate(value: string | null | undefined): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return dateFormatter.value.format(date);
}

function formatRawValue(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === 'boolean') return value ? t('security.devices.details.boolean.yes') : t('security.devices.details.boolean.no');
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const asDate = formatDeviceDate(trimmed);
        return asDate || trimmed;
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

function filterRows(rows: Array<{ label: string; value: string | null | undefined }>): DeviceDetailRow[] {
    return rows
        .filter((row): row is { label: string; value: string } => !!row.value && String(row.value).trim().length > 0)
        .map((row) => ({ label: row.label, value: String(row.value) }));
}

/** Aperçu liste : champs essentiels uniquement. */
function deviceSummaryRows(device: AuthDevice): DeviceDetailRow[] {
    return filterRows([
        { label: t('security.devices.summary.firstSeen'), value: formatDeviceDate(device.firstSeenAt || device.createdAt) },
        { label: t('security.devices.summary.lastActive'), value: formatDeviceDate(device.lastSeenAt || device.lastActiveAt) }
    ]);
}

/** Détails complets (modal). */
function deviceDetailRows(device: AuthDevice): DeviceDetailRow[] {
    const location = [device.city, device.region, device.country].filter(Boolean).join(', ') || null;
    const rows: Array<{ label: string; value: string | null | undefined }> = [
        { label: t('security.devices.details.rows.type'), value: device.deviceType },
        { label: t('security.devices.details.rows.browser'), value: device.browser },
        { label: t('security.devices.details.rows.os'), value: device.os },
        { label: t('security.devices.details.rows.location'), value: location },
        { label: t('security.devices.details.rows.ip'), value: device.ipAddress },
        { label: t('security.devices.details.rows.lastActive'), value: formatDeviceDate(device.lastSeenAt || device.lastActiveAt) },
        { label: t('security.devices.details.rows.firstSeen'), value: formatDeviceDate(device.firstSeenAt || device.createdAt) },
        {
            label: t('security.devices.details.rows.sessionCount'),
            value: device.sessionCount != null ? String(device.sessionCount) : null
        },
        {
            label: t('security.devices.details.rows.trusted'),
            value:
                device.isTrusted == null
                    ? null
                    : device.isTrusted
                      ? t('security.devices.details.boolean.yes')
                      : t('security.devices.details.boolean.no')
        },
        { label: t('security.devices.details.rows.identifier'), value: device.deviceIdentifier },
        { label: t('security.devices.details.rows.userAgent'), value: device.userAgent }
    ];

    if (device.raw) {
        for (const [key, value] of Object.entries(device.raw)) {
            if (KNOWN_RAW_KEYS.has(key)) continue;
            const formatted = formatRawValue(value);
            if (!formatted) continue;
            rows.push({ label: key, value: formatted });
        }
    }

    return filterRows(rows);
}

function openDeviceDetails(device: AuthDevice) {
    detailsDevice.value = device;
    detailsOpen.value = true;
}

function onDetailsOpenChange(value: boolean) {
    detailsOpen.value = value;
    if (!value) detailsDevice.value = null;
}

function isMobileDevice(device: AuthDevice): boolean {
    const haystack = `${device.deviceName ?? ''} ${device.deviceType ?? ''} ${device.os ?? ''} ${device.browser ?? ''} ${device.userAgent ?? ''}`;
    return /mobile|android|iphone|ipad|ipod|phone|ios/i.test(haystack);
}

function isCurrentDevice(device: AuthDevice): boolean {
    if (device.isCurrentDevice === true) return true;
    if (device.isCurrentDevice === false) return false;
    return device.deviceIdentifier === currentDeviceId;
}

async function loadDevices() {
    devicesLoading.value = true;
    devicesError.value = null;
    try {
        devices.value = await auth.listDevices();
    } catch (e: unknown) {
        devicesError.value = e instanceof Error ? e.message : String(e);
        devices.value = [];
    } finally {
        devicesLoading.value = false;
    }
}

onMounted(async () => {
    if (!auth.user) {
        await auth.fetchMe();
    }
    await loadDevices();
});

function openSetup() {
    successMessage.value = null;
    setupOpen.value = true;
}

function openDisable() {
    successMessage.value = null;
    disableOpen.value = true;
}

function onEnabled() {
    successMessage.value = t('security.twoFactor.success.enabled');
}

function onDisabled() {
    successMessage.value = t('security.twoFactor.success.disabled');
}

function isDeviceTrusted(device: AuthDevice): boolean {
    return device.isTrusted === true;
}

async function setDeviceTrust(device: AuthDevice, isTrusted: boolean) {
    if (trustLoadingId.value || isDeviceTrusted(device) === isTrusted) return;
    trustLoadingId.value = device.deviceIdentifier;
    devicesError.value = null;
    try {
        await auth.setDeviceTrust(device.deviceIdentifier, isTrusted);
        await loadDevices();
        if (detailsDevice.value?.deviceIdentifier === device.deviceIdentifier) {
            detailsDevice.value = devices.value.find((d) => d.deviceIdentifier === device.deviceIdentifier) ?? null;
        }
    } catch (e: unknown) {
        devicesError.value = e instanceof Error ? e.message : String(e);
    } finally {
        trustLoadingId.value = null;
    }
}

async function revokeDevice(device: AuthDevice) {
    if (revokeLoadingId.value) return;
    revokeLoadingId.value = device.deviceIdentifier;
    devicesError.value = null;
    try {
        await auth.revokeDevice(device.deviceIdentifier);
        if (isCurrentDevice(device)) {
            await auth.forceReLogin(t('security.devices.success.currentDeviceRevoked'));
            return;
        }
        successMessage.value = t('security.devices.success.deviceRevoked');
        await loadDevices();
    } catch (e: unknown) {
        devicesError.value = e instanceof Error ? e.message : String(e);
    } finally {
        revokeLoadingId.value = null;
    }
}

async function confirmRevokeAll() {
    if (revokeAllLoading.value) return;
    revokeAllLoading.value = true;
    devicesError.value = null;
    try {
        await auth.revokeAllDevices();
    } catch (e: unknown) {
        devicesError.value = e instanceof Error ? e.message : String(e);
        revokeAllLoading.value = false;
        revokeAllOpen.value = false;
    }
}
</script>

<template>
    <div class="security-tab">
        <v-row class="justify-center py-1" no-gutters>
            <v-col cols="12" md="9" class="pb-4">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                            <div class="d-flex align-center ga-3 flex-wrap">
                                <v-avatar size="48" rounded="md" color="lightprimary">
                                    <ShieldCheckIcon class="text-primary" size="25" />
                                </v-avatar>
                                <h4 class="text-h4 mb-0">{{ t('security.twoFactor.title') }}</h4>
                            </div>
                            <v-chip :color="twoFactorEnabled ? 'success' : 'default'" variant="tonal" size="small">
                                {{ twoFactorEnabled ? t('security.twoFactor.status.enabled') : t('security.twoFactor.status.disabled') }}
                            </v-chip>
                        </div>
                        <div class="text-subtitle-1 text-medium-emphasis text-10 my-3">
                            {{ t('security.twoFactor.subtitle') }}
                        </div>

                        <AppAlert
                            v-if="successMessage"
                            color="success"
                            variant="tonal"
                            density="default"
                            closable
                            :dismiss-ms="5000"
                            class="mt-4"
                            @dismiss="successMessage = null"
                        >
                            <template #prepend>
                                <v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon>
                            </template>
                            <div>{{ successMessage }}</div>
                        </AppAlert>

                        <div class="d-sm-flex justify-space-between align-sm-center mt-4 mb-8">
                            <div class="text-subtitle-1 text-medium-emphasis text-13 pr-5">
                                {{ t('security.twoFactor.description') }}
                            </div>
                            <v-btn v-if="!twoFactorEnabled" color="primary" class="mt-sm-0 mt-3" flat @click="openSetup">
                                {{ t('security.twoFactor.enable') }}
                            </v-btn>
                            <v-btn v-else color="error" class="mt-sm-0 mt-3" variant="outlined" flat @click="openDisable">
                                {{ t('security.twoFactor.disable') }}
                            </v-btn>
                        </div>

                        <v-divider />

                        <div class="d-flex justify-space-between align-center flex-wrap ga-3 my-4">
                            <div>
                                <h6 class="text-h6 mb-1">{{ t('security.twoFactor.otherEmail.title') }}</h6>
                                <h5 class="text-subtitle-1 text-medium-emphasis">{{ t('security.twoFactor.otherEmail.subtitle') }}</h5>
                            </div>
                            <v-btn class="bg-lightprimary text-primary" flat disabled>{{ t('security.twoFactor.otherEmail.soon') }}</v-btn>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="9">
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

                        <AppAlert v-if="devicesError" type="error" class="mt-4" closable @dismiss="devicesError = null">
                            {{ devicesError }}
                        </AppAlert>

                        <v-btn
                            color="primary"
                            class="mt-2"
                            flat
                            :loading="revokeAllLoading"
                            :disabled="devicesLoading || devices.length === 0"
                            @click="revokeAllOpen = true"
                        >
                            {{ t('security.devices.revokeAll') }}
                        </v-btn>

                        <div class="mt-sm-8 mt-5">
                            <div v-if="devicesLoading" class="d-flex justify-center py-6">
                                <v-progress-circular indeterminate color="primary" size="28" />
                            </div>

                            <div v-else-if="devices.length === 0" class="text-subtitle-1 text-medium-emphasis py-4">
                                {{ t('security.devices.empty') }}
                            </div>

                            <template v-else>
                                <template v-for="(device, index) in devices" :key="device.deviceIdentifier">
                                    <v-divider v-if="index > 0" />
                                    <div class="d-flex align-start my-4">
                                        <v-avatar size="30" rounded="md" color="surface" class="mt-1 flex-shrink-0">
                                            <DeviceMobileIcon v-if="isMobileDevice(device)" size="25" />
                                            <DeviceLaptopIcon v-else size="25" />
                                        </v-avatar>
                                        <div class="ml-3 pr-2 flex-grow-1" style="min-width: 0">
                                            <div class="d-flex align-center flex-wrap ga-2 mb-2">
                                                <h6 class="text-h6 mb-0 text-truncate">
                                                    {{ device.deviceName || t('security.devices.fallbackName') }}
                                                </h6>
                                                <v-chip v-if="isCurrentDevice(device)" size="x-small" color="primary" variant="tonal">
                                                    {{ t('security.devices.chips.current') }}
                                                </v-chip>
                                                <v-chip v-if="isDeviceTrusted(device)" size="x-small" color="success" variant="tonal">
                                                    {{ t('security.devices.chips.trusted') }}
                                                </v-chip>
                                            </div>
                                            <div
                                                v-for="row in deviceSummaryRows(device)"
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
                                                        revokeLoadingId === device.deviceIdentifier ||
                                                        trustLoadingId === device.deviceIdentifier
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
                                                    @click="openDeviceDetails(device)"
                                                />
                                                <v-list-item
                                                    v-if="!isDeviceTrusted(device)"
                                                    :title="t('security.devices.menu.trust')"
                                                    @click="setDeviceTrust(device, true)"
                                                />
                                                <v-list-item
                                                    v-else
                                                    :title="t('security.devices.menu.untrust')"
                                                    @click="setDeviceTrust(device, false)"
                                                />
                                                <v-list-item :title="t('security.devices.menu.disconnect')" @click="revokeDevice(device)" />
                                            </v-list>
                                        </v-menu>
                                    </div>
                                </template>
                            </template>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>
        </v-row>

        <TwoFactorSetupDialog v-model="setupOpen" @enabled="onEnabled" />
        <TwoFactorDisableDialog v-model="disableOpen" @disabled="onDisabled" />

        <AppModalBase
            v-model="revokeAllOpen"
            :title="t('security.devices.revokeAllModal.title')"
            :subtitle="t('security.devices.revokeAllModal.subtitle')"
            :max-width="440"
            :scrollable="false"
        >
            <p class="text-body-1 mb-0">{{ t('security.devices.revokeAllModal.body') }}</p>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="revokeAllLoading" @click="close">{{ t('common.cancel') }}</v-btn>
                <v-spacer />
                <v-btn color="error" flat :loading="revokeAllLoading" @click="confirmRevokeAll">
                    {{ t('security.devices.revokeAllModal.confirm') }}
                </v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            :model-value="detailsOpen"
            :title="detailsTitle"
            :subtitle="detailsDevice && isCurrentDevice(detailsDevice) ? t('security.devices.details.currentSubtitle') : undefined"
            :max-width="480"
            :height="520"
            @update:model-value="onDetailsOpenChange"
        >
            <div v-if="detailsRows.length === 0" class="text-body-1 text-medium-emphasis">
                {{ t('security.devices.details.empty') }}
            </div>
            <div v-else class="d-flex flex-column ga-3">
                <div v-for="row in detailsRows" :key="row.label">
                    <div class="text-subtitle-2 text-medium-emphasis mb-1">{{ row.label }}</div>
                    <div class="text-body-1 text-break">{{ row.value }}</div>
                </div>
            </div>

            <template #footer="{ close }">
                <v-btn
                    v-if="detailsDevice && !isDeviceTrusted(detailsDevice)"
                    color="primary"
                    variant="tonal"
                    flat
                    :loading="trustLoadingId === detailsDevice.deviceIdentifier"
                    @click="setDeviceTrust(detailsDevice, true)"
                >
                    {{ t('security.devices.details.trust') }}
                </v-btn>
                <v-btn
                    v-else-if="detailsDevice"
                    color="default"
                    variant="tonal"
                    flat
                    :loading="trustLoadingId === detailsDevice.deviceIdentifier"
                    @click="setDeviceTrust(detailsDevice, false)"
                >
                    {{ t('security.devices.details.untrust') }}
                </v-btn>
                <v-spacer />
                <v-btn color="primary" flat @click="close">{{ t('security.devices.details.close') }}</v-btn>
            </template>
        </AppModalBase>
    </div>
</template>

<style scoped>
.security-tab {
    max-width: 100%;
    overflow-x: hidden;
}
</style>
