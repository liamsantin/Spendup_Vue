<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { DeviceLaptopIcon, DeviceMobileIcon, DotsVerticalIcon } from 'vue-tabler-icons';
import { getOrCreateDeviceId, useAuthStore, type AuthDevice } from '@/features/auth';
import { resolveIsCurrentDevice } from '@/features/auth/device-current';
import { withStepUpRetry } from '@/features/auth/step-up';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppConfirmationModal from '@/components/shared/AppConfirmationModal.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';

const emit = defineEmits<{
    success: [message: string];
}>();

const auth = useAuthStore();
const { t, locale } = useI18n();

const revokeAllOpen = ref(false);
const revokeOpen = ref(false);
const revokeTarget = ref<AuthDevice | null>(null);
const detailsOpen = ref(false);
const detailsDevice = ref<AuthDevice | null>(null);
const devicesError = ref<string | null>(null);

const devices = ref<AuthDevice[]>([]);
const devicesLoading = ref(false);
const revokeLoadingId = ref<string | null>(null);
const trustLoadingId = ref<string | null>(null);
const revokeAllLoading = ref(false);

const currentDeviceId = getOrCreateDeviceId();
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
    'trustedUntil',
    'trusted_until',
    'TrustedUntil',
    'lastIpAddress',
    'last_ip_address',
    'lastCountry',
    'last_country',
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

function deviceSummaryRows(device: AuthDevice): DeviceDetailRow[] {
    return filterRows([
        { label: t('security.devices.summary.firstSeen'), value: formatDeviceDate(device.firstSeenAt || device.createdAt) },
        { label: t('security.devices.summary.lastActive'), value: formatDeviceDate(device.lastSeenAt || device.lastActiveAt) },
        {
            label: t('security.devices.summary.trustedUntil'),
            value: device.isTrusted ? formatDeviceDate(device.trustedUntil) : null
        }
    ]);
}

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
        {
            label: t('security.devices.details.rows.trustedUntil'),
            value: device.isTrusted ? formatDeviceDate(device.trustedUntil) : null
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
    return resolveIsCurrentDevice(device, currentDeviceId);
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

onMounted(() => {
    void loadDevices();
});

function isDeviceTrusted(device: AuthDevice): boolean {
    return device.isTrusted === true;
}

async function setDeviceTrust(device: AuthDevice, isTrusted: boolean) {
    if (trustLoadingId.value || isDeviceTrusted(device) === isTrusted) return;
    trustLoadingId.value = device.deviceIdentifier;
    devicesError.value = null;
    try {
        await withStepUpRetry((stepUp) => auth.setDeviceTrust(device.deviceIdentifier, isTrusted, stepUp));
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

function openRevokeDevice(device: AuthDevice) {
    revokeTarget.value = device;
    revokeOpen.value = true;
}

function onRevokeOpenChange(value: boolean) {
    revokeOpen.value = value;
    if (!value) revokeTarget.value = null;
}

async function confirmRevokeDevice() {
    const device = revokeTarget.value;
    if (!device || revokeLoadingId.value) return;
    revokeLoadingId.value = device.deviceIdentifier;
    devicesError.value = null;
    try {
        await withStepUpRetry((stepUp) => auth.revokeDevice(device.deviceIdentifier, stepUp));
        revokeOpen.value = false;
        revokeTarget.value = null;
        if (isCurrentDevice(device)) {
            await auth.forceReLogin(t('security.devices.success.currentDeviceRevoked'));
            return;
        }
        emit('success', t('security.devices.success.deviceRevoked'));
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
        await withStepUpRetry((stepUp) => auth.revokeAllDevices(stepUp));
    } catch (e: unknown) {
        devicesError.value = e instanceof Error ? e.message : String(e);
        revokeAllLoading.value = false;
        revokeAllOpen.value = false;
    }
}
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
                                        :loading="revokeLoadingId === device.deviceIdentifier || trustLoadingId === device.deviceIdentifier"
                                        v-bind="menuProps"
                                    >
                                        <v-avatar size="20">
                                            <DotsVerticalIcon />
                                        </v-avatar>
                                    </v-btn>
                                </template>
                                <v-list density="compact" min-width="200">
                                    <v-list-item :title="t('security.devices.menu.viewDetails')" @click="openDeviceDetails(device)" />
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
                                    <v-list-item :title="t('security.devices.menu.disconnect')" @click="openRevokeDevice(device)" />
                                </v-list>
                            </v-menu>
                        </div>
                    </template>
                </template>
            </div>
        </v-card-item>
    </v-card>

    <AppConfirmationModal
        v-model="revokeAllOpen"
        :title="t('security.devices.revokeAllModal.title')"
        :message="t('security.devices.revokeAllModal.body')"
        :confirm-label="t('security.devices.revokeAllModal.confirm')"
        confirm-color="error"
        :loading="revokeAllLoading"
        @confirm="confirmRevokeAll"
    />

    <AppConfirmationModal
        :model-value="revokeOpen"
        :title="t('security.devices.revokeModal.title')"
        :message="
            revokeTarget && isCurrentDevice(revokeTarget)
                ? t('security.devices.revokeModal.bodyCurrent')
                : t('security.devices.revokeModal.body')
        "
        :confirm-label="t('security.devices.revokeModal.confirm')"
        confirm-color="error"
        :loading="!!revokeLoadingId"
        @update:model-value="onRevokeOpenChange"
        @confirm="confirmRevokeDevice"
    />

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
</template>
