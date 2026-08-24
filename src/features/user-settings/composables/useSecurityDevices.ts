import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getOrCreateDeviceId, useAuthStore, type AuthDevice } from '@/features/auth';
import { resolveIsCurrentDevice } from '@/features/auth/device-current';
import { withStepUpRetry } from '@/features/auth/step-up';

type DeviceDetailRow = { label: string; value: string };

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

/**
 * Gestion des appareils / sessions de sécurité (liste, confiance, révocation).
 * @param options Callback succès (toast / alert parent).
 * @returns État et actions (objet réactif).
 */
export function useSecurityDevices(options: { onSuccess: (message: string) => void }) {
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

    const dateFormatter = computed(
        () =>
            new Intl.DateTimeFormat(locale.value, {
                dateStyle: 'medium',
                timeStyle: 'short'
            })
    );

    /**
     * Formate une date d’appareil pour l’UI.
     * @param value ISO ou chaîne brute.
     */
    function formatDeviceDate(value: string | null | undefined): string | null {
        if (!value) return null;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return dateFormatter.value.format(date);
    }

    /**
     * Formate une valeur `raw` inconnue pour les détails.
     * @param value Valeur arbitraire.
     */
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

    /** Filtre les lignes vides du détail appareil. */
    function filterRows(rows: Array<{ label: string; value: string | null | undefined }>): DeviceDetailRow[] {
        return rows
            .filter((row): row is { label: string; value: string } => !!row.value && String(row.value).trim().length > 0)
            .map((row) => ({ label: row.label, value: String(row.value) }));
    }

    /**
     * Lignes de résumé affichées sur la carte appareil.
     * @param device Appareil source.
     */
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

    /**
     * Lignes détaillées de la fiche appareil (y compris clés `raw` inconnues).
     * @param device Appareil source.
     */
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

    /**
     * Ouvre la fiche détail d’un appareil.
     * @param device Appareil sélectionné.
     */
    function openDeviceDetails(device: AuthDevice) {
        detailsDevice.value = device;
        detailsOpen.value = true;
    }

    /**
     * Synchronise l’ouverture du modal détail.
     * @param value Ouvert / fermé.
     */
    function onDetailsOpenChange(value: boolean) {
        detailsOpen.value = value;
        if (!value) detailsDevice.value = null;
    }

    /**
     * Heuristique mobile (nom / type / UA).
     * @param device Appareil à tester.
     */
    function isMobileDevice(device: AuthDevice): boolean {
        const haystack = `${device.deviceName ?? ''} ${device.deviceType ?? ''} ${device.os ?? ''} ${device.browser ?? ''} ${device.userAgent ?? ''}`;
        return /mobile|android|iphone|ipad|ipod|phone|ios/i.test(haystack);
    }

    /**
     * Indique si l’appareil est celui de la session courante.
     * @param device Appareil à tester.
     */
    function isCurrentDevice(device: AuthDevice): boolean {
        return resolveIsCurrentDevice(device, currentDeviceId);
    }

    /** Charge la liste des appareils depuis l’API. */
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

    /**
     * Met à jour le statut de confiance d’un appareil.
     * @param device Appareil cible.
     * @param isTrusted Nouvelle valeur.
     */
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

    /**
     * Ouvre la confirmation de révocation d’un appareil.
     * @param device Appareil cible.
     */
    function openRevokeDevice(device: AuthDevice) {
        revokeTarget.value = device;
        revokeOpen.value = true;
    }

    /**
     * Synchronise l’ouverture du modal de révocation.
     * @param value Ouvert / fermé.
     */
    function onRevokeOpenChange(value: boolean) {
        revokeOpen.value = value;
        if (!value) revokeTarget.value = null;
    }

    /** Confirme la révocation de l’appareil ciblé. */
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
            options.onSuccess(t('security.devices.success.deviceRevoked'));
            await loadDevices();
        } catch (e: unknown) {
            devicesError.value = e instanceof Error ? e.message : String(e);
        } finally {
            revokeLoadingId.value = null;
        }
    }

    /** Révoque toutes les sessions (force re-login côté auth). */
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

    return reactive({
        revokeAllOpen,
        revokeOpen,
        revokeTarget,
        detailsOpen,
        detailsDevice,
        devicesError,
        devices,
        devicesLoading,
        revokeLoadingId,
        trustLoadingId,
        revokeAllLoading,
        detailsTitle,
        detailsRows,
        deviceSummaryRows,
        openDeviceDetails,
        onDetailsOpenChange,
        isMobileDevice,
        isCurrentDevice,
        isDeviceTrusted,
        setDeviceTrust,
        openRevokeDevice,
        onRevokeOpenChange,
        confirmRevokeDevice,
        confirmRevokeAll
    });
}
