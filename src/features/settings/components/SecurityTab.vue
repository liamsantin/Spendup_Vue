<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { DeviceLaptopIcon, DeviceMobileIcon, DotsVerticalIcon } from 'vue-tabler-icons';
import { getOrCreateDeviceId, useAuthStore, type AuthDevice } from '@/features/auth';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';
import TwoFactorSetupDialog from './TwoFactorSetupDialog.vue';
import TwoFactorDisableDialog from './TwoFactorDisableDialog.vue';

const auth = useAuthStore();

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
const detailsTitle = computed(() => detailsDevice.value?.deviceName || 'Détails de l’appareil');
const detailsRows = computed(() => (detailsDevice.value ? deviceDetailRows(detailsDevice.value) : []));

type DeviceDetailRow = { label: string; value: string };

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
});

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
    return dateFormatter.format(date);
}

function formatRawValue(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
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
        { label: 'Première connexion', value: formatDeviceDate(device.firstSeenAt || device.createdAt) },
        { label: 'Dernière activité', value: formatDeviceDate(device.lastSeenAt || device.lastActiveAt) }
    ]);
}

/** Détails complets (modal). */
function deviceDetailRows(device: AuthDevice): DeviceDetailRow[] {
    const location = [device.city, device.region, device.country].filter(Boolean).join(', ') || null;
    const rows: Array<{ label: string; value: string | null | undefined }> = [
        { label: 'Type', value: device.deviceType },
        { label: 'Navigateur', value: device.browser },
        { label: 'Système', value: device.os },
        { label: 'Localisation', value: location },
        { label: 'Adresse IP', value: device.ipAddress },
        { label: 'Dernière activité', value: formatDeviceDate(device.lastSeenAt || device.lastActiveAt) },
        { label: 'Première connexion', value: formatDeviceDate(device.firstSeenAt || device.createdAt) },
        {
            label: 'Sessions actives',
            value: device.sessionCount != null ? String(device.sessionCount) : null
        },
        {
            label: 'Appareil de confiance',
            value: device.isTrusted == null ? null : device.isTrusted ? 'Oui' : 'Non'
        },
        { label: 'Identifiant', value: device.deviceIdentifier },
        { label: 'User-Agent', value: device.userAgent }
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
    successMessage.value = 'La double authentification est maintenant activée.';
}

function onDisabled() {
    successMessage.value = 'La double authentification a été désactivée.';
}

function isDeviceTrusted(device: AuthDevice): boolean {
    return device.isTrusted === true;
}

async function trustDevice(device: AuthDevice) {
    if (trustLoadingId.value || isDeviceTrusted(device)) return;
    trustLoadingId.value = device.deviceIdentifier;
    devicesError.value = null;
    try {
        await auth.trustDevice(device.deviceIdentifier);
        successMessage.value = 'Appareil marqué comme de confiance.';
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
            await auth.forceReLogin('Cet appareil a été déconnecté. Veuillez vous reconnecter.');
            return;
        }
        successMessage.value = 'Appareil déconnecté.';
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
    <v-card elevation="10">
        <v-row class="ma-sm-n2 ma-n1">
            <v-col cols="12" md="8">
                <v-card elevation="10">
                    <v-card-item>
                        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                            <h4 class="text-h4">Authentification à deux facteurs</h4>
                            <v-chip :color="twoFactorEnabled ? 'success' : 'default'" variant="tonal" size="small">
                                {{ twoFactorEnabled ? 'Activée' : 'Désactivée' }}
                            </v-chip>
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

                        <div class="d-sm-flex justify-space-between mt-4 mb-8">
                            <div class="text-subtitle-1 text-medium-emphasis text-13 pr-5">
                                Ajoutez une couche de sécurité supplémentaire à votre compte en activant l’authentification à deux facteurs
                                via une application (TOTP).
                            </div>
                            <v-btn v-if="!twoFactorEnabled" color="primary" class="mt-sm-0 mt-3" flat @click="openSetup"> Activer </v-btn>
                            <v-btn v-else color="error" class="mt-sm-0 mt-3" variant="outlined" flat @click="openDisable">
                                Désactiver
                            </v-btn>
                        </div>

                        <v-divider></v-divider>

                        <div class="d-flex justify-space-between my-4">
                            <div>
                                <h6 class="text-h6 mb-1">Autre e-mail</h6>
                                <h5 class="text-subtitle-1 text-medium-emphasis">Non disponible pour le moment</h5>
                            </div>
                            <v-btn class="bg-lightprimary text-primary" flat disabled>Bientôt</v-btn>
                        </div>
                    </v-card-item>
                </v-card>
            </v-col>

            <v-col cols="12" md="4">
                <v-card elevation="10">
                    <v-card-item>
                        <v-avatar size="48" rounded="md" color="lightprimary">
                            <DeviceLaptopIcon class="text-primary" size="25" />
                        </v-avatar>
                        <h5 class="text-h5 mt-4">Appareils</h5>
                        <div class="text-subtitle-1 mt-3 text-medium-emphasis text-10">Gérez les appareils connectés à votre compte.</div>

                        <AppAlert v-if="devicesError" type="error" class="mt-4" closable @dismiss="devicesError = null">
                            {{ devicesError }}
                        </AppAlert>

                        <v-btn
                            color="primary"
                            class="mt-4"
                            flat
                            :loading="revokeAllLoading"
                            :disabled="devicesLoading || devices.length === 0"
                            @click="revokeAllOpen = true"
                        >
                            Déconnecter tous les appareils
                        </v-btn>

                        <div class="mt-sm-8 mt-5">
                            <div v-if="devicesLoading" class="d-flex justify-center py-6">
                                <v-progress-circular indeterminate color="primary" size="28" />
                            </div>

                            <div v-else-if="devices.length === 0" class="text-subtitle-1 text-medium-emphasis py-4">
                                Aucun appareil connecté.
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
                                                <h6 class="text-h6 mb-0 text-truncate">{{ device.deviceName || 'Appareil' }}</h6>
                                                <v-chip v-if="isCurrentDevice(device)" size="x-small" color="primary" variant="tonal">
                                                    Cet appareil
                                                </v-chip>
                                                <v-chip v-if="isDeviceTrusted(device)" size="x-small" color="success" variant="tonal">
                                                    De confiance
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
                                            <v-list density="compact" min-width="180">
                                                <v-list-item title="Voir les détails" @click="openDeviceDetails(device)" />
                                                <v-list-item
                                                    v-if="!isDeviceTrusted(device)"
                                                    title="Faire confiance"
                                                    @click="trustDevice(device)"
                                                />
                                                <v-list-item title="Déconnecter" @click="revokeDevice(device)" />
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
            title="Déconnecter tous les appareils"
            subtitle="Toutes les sessions seront révoquées, y compris celle en cours. Vous devrez vous reconnecter."
            :max-width="440"
            :scrollable="false"
        >
            <p class="text-body-1 mb-0">Cette action déconnecte immédiatement tous les appareils liés à votre compte.</p>

            <template #footer="{ close }">
                <v-btn variant="text" flat :disabled="revokeAllLoading" @click="close">Annuler</v-btn>
                <v-spacer />
                <v-btn color="error" flat :loading="revokeAllLoading" @click="confirmRevokeAll">Tout déconnecter</v-btn>
            </template>
        </AppModalBase>

        <AppModalBase
            :model-value="detailsOpen"
            :title="detailsTitle"
            :subtitle="detailsDevice && isCurrentDevice(detailsDevice) ? 'Appareil actuel' : undefined"
            :max-width="480"
            :height="520"
            @update:model-value="onDetailsOpenChange"
        >
            <div v-if="detailsRows.length === 0" class="text-body-1 text-medium-emphasis">Aucun détail disponible pour cet appareil.</div>
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
                    @click="trustDevice(detailsDevice)"
                >
                    Faire confiance
                </v-btn>
                <v-spacer />
                <v-btn color="primary" flat @click="close">Fermer</v-btn>
            </template>
        </AppModalBase>
    </v-card>
</template>
