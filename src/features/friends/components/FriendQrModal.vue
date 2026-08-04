<script setup lang="ts">
/**
 * Modal QR amis : afficher mon publicId en QR, scanner un autre utilisateur.
 */
defineOptions({ name: 'FriendQrModal' });

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraIcon, QrcodeIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/AppAlert.vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';
import { useAuthStore } from '@/features/auth';
import { buildFriendQrPayload, parseFriendQrPayload } from '../qr';

type FriendQrView = 'Qr' | 'Add';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    scanned: [publicId: string];
}>();

const { t } = useI18n();
const auth = useAuthStore();
const modalRef = ref<InstanceType<typeof AppModalBase> | null>(null);
const scannerHost = ref<HTMLElement | null>(null);

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const view = ref<FriendQrView>('Qr');
const qrDataUrl = ref<string | null>(null);
const qrError = ref<string | null>(null);
const scanError = ref<string | null>(null);
const scannerReady = ref(false);
const cameraStarting = ref(false);
/** Affiche le CTA d’activation caméra. */
const cameraNeedsEnable = ref(true);

/** Id unique par ouverture — évite collisions si plusieurs instances / HMR. */
const scannerElementId = `friend-qr-scanner-${Math.random().toString(36).slice(2, 9)}`;

let scanner: Html5Qrcode | null = null;
let startGeneration = 0;
let handledScan = false;

const publicId = computed(() => auth.user?.userPublicId?.trim().toUpperCase() || '');

async function generateQr() {
    qrError.value = null;
    qrDataUrl.value = null;
    if (!publicId.value) {
        qrError.value = t('friendsPage.qr.missingPublicId');
        return;
    }
    try {
        const payload = buildFriendQrPayload(publicId.value);
        qrDataUrl.value = await QRCode.toDataURL(payload, {
            width: 240,
            margin: 2,
            errorCorrectionLevel: 'M'
        });
    } catch (e: unknown) {
        qrError.value = e instanceof Error ? e.message : String(e);
    }
}

function errorDetail(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof DOMException) return `${error.name}: ${error.message}`;
    if (error instanceof Error) return error.name ? `${error.name}: ${error.message}` : error.message;
    return String(error ?? '');
}

function cameraErrorMessage(error: unknown): string {
    const detail = errorDetail(error);
    const lower = detail.toLowerCase();
    let base = t('friendsPage.qr.cameraError');
    if (/notfound|no camera|devicesnotfound|unavailable/i.test(lower)) {
        base = t('friendsPage.qr.cameraUnavailable');
    } else if (/notallowed|permission|denied|securityerror|insecure/i.test(lower)) {
        base = `${t('friendsPage.qr.cameraPermissionNeeded')} ${t('friendsPage.qr.cameraPermissionDeniedHint')}`;
    } else if (/notreadable|trackstart|abort|in use|busy/i.test(lower)) {
        base = t('friendsPage.qr.cameraBusy');
    }
    return detail ? `${base} (${detail})` : base;
}

async function stopScanner() {
    scannerReady.value = false;
    const current = scanner;
    scanner = null;
    if (!current) return;
    try {
        if (current.isScanning) {
            await current.stop();
        }
    } catch {
        // ignore
    }
    try {
        current.clear();
    } catch {
        // ignore
    }
    if (scannerHost.value) {
        scannerHost.value.innerHTML = '';
    }
}

async function tryStartWithConfig(config: string | MediaTrackConstraints) {
    if (!scannerHost.value) {
        throw new Error('Scanner element missing');
    }
    scannerHost.value.innerHTML = '';
    scanner = new Html5Qrcode(scannerElementId);
    await scanner.start(
        config,
        {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const side = Math.min(220, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75));
                return { width: side, height: side };
            }
        },
        (decodedText) => {
            void onScanSuccess(decodedText);
        },
        () => undefined
    );
}

/**
 * Démarrage caméra — uniquement depuis un clic.
 * Important : `getUserMedia` doit être le premier await (geste utilisateur Chrome).
 */
async function startScanner() {
    if (cameraStarting.value) return;
    if (scanner?.isScanning) return;

    const generation = ++startGeneration;
    scanError.value = null;
    handledScan = false;

    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(location.hostname)) {
        scanError.value = cameraErrorMessage(new DOMException('Camera requires HTTPS or localhost', 'SecurityError'));
        cameraNeedsEnable.value = true;
        return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
        scanError.value = cameraErrorMessage(new DOMException('getUserMedia unavailable', 'NotFoundError'));
        cameraNeedsEnable.value = true;
        return;
    }

    // 1) Premier await = getUserMedia (conserve le geste utilisateur → popup permission).
    let unlockStream: MediaStream;
    try {
        unlockStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (e: unknown) {
        scanError.value = cameraErrorMessage(e);
        cameraNeedsEnable.value = true;
        return;
    }

    cameraStarting.value = true;
    cameraNeedsEnable.value = false;

    try {
        const deviceId = unlockStream.getVideoTracks()[0]?.getSettings()?.deviceId || '';
        unlockStream.getTracks().forEach((track) => track.stop());

        await nextTick();
        if (generation !== startGeneration) return;

        await stopScanner();
        if (generation !== startGeneration) return;

        // 2) Démarrer le scan avec le device déjà autorisé (évite un 2e prompt).
        if (deviceId) {
            await tryStartWithConfig(deviceId);
        } else {
            await tryStartWithConfig({ facingMode: 'user' });
        }

        if (generation !== startGeneration) {
            await stopScanner();
            return;
        }

        scannerReady.value = true;
        cameraNeedsEnable.value = false;
        scanError.value = null;
    } catch (e: unknown) {
        if (generation !== startGeneration) return;
        scanError.value = cameraErrorMessage(e);
        cameraNeedsEnable.value = true;
        await stopScanner();
    } finally {
        if (generation === startGeneration) {
            cameraStarting.value = false;
        }
        await modalRef.value?.refreshScrollbar();
    }
}

async function onScanSuccess(decodedText: string) {
    if (handledScan) return;
    const id = parseFriendQrPayload(decodedText);
    if (!id) {
        scanError.value = t('friendsPage.qr.invalidQr');
        return;
    }
    if (publicId.value && id === publicId.value) {
        scanError.value = t('friendsPage.qr.selfScan');
        return;
    }
    handledScan = true;
    await stopScanner();
    open.value = false;
    emit('scanned', id);
}

function onOpenChange(value: boolean) {
    open.value = value;
}

function resetCameraUi() {
    scanError.value = null;
    cameraNeedsEnable.value = true;
    cameraStarting.value = false;
    scannerReady.value = false;
}

watch(
    () => props.modelValue,
    async (isOpen) => {
        startGeneration += 1;
        if (isOpen) {
            view.value = 'Qr';
            handledScan = false;
            resetCameraUi();
            await generateQr();
            await modalRef.value?.refreshScrollbar();
            return;
        }
        await stopScanner();
        view.value = 'Qr';
        resetCameraUi();
    }
);

watch(view, async (value) => {
    if (!props.modelValue) return;
    startGeneration += 1;
    if (value === 'Add') {
        resetCameraUi();
        await nextTick();
        await modalRef.value?.refreshScrollbar();
        return;
    }
    await stopScanner();
    resetCameraUi();
    await modalRef.value?.refreshScrollbar();
});

onBeforeUnmount(() => {
    startGeneration += 1;
    void stopScanner();
});
</script>

<template>
    <AppModalBase
        ref="modalRef"
        :model-value="open"
        :title="t('friendsPage.qr.title')"
        :subtitle="t('friendsPage.qr.subtitle')"
        :max-width="520"
        :height="640"
        @update:model-value="onOpenChange"
    >
        <template #toolbar>
            <v-tabs v-model="view" align-tabs="start" color="primary" bg-color="transparent" density="comfortable" class="friend-qr-tabs">
                <v-tab value="Qr" class="text-none">
                    <QrcodeIcon class="mr-2" size="18" stroke-width="1.5" />
                    {{ t('friendsPage.qr.tabs.qr') }}
                </v-tab>
                <v-tab value="Add" class="text-none">
                    <CameraIcon class="mr-2" size="18" stroke-width="1.5" />
                    {{ t('friendsPage.qr.tabs.add') }}
                </v-tab>
            </v-tabs>
            <v-divider />
        </template>

        <v-window v-model="view">
            <v-window-item value="Qr">
                <div class="friend-qr-panel d-flex flex-column align-center text-center ga-3 py-2">
                    <AppAlert v-if="qrError" type="error" density="default" class="w-100" closable @dismiss="qrError = null">
                        {{ qrError }}
                    </AppAlert>
                    <template v-else>
                        <p class="text-body-2 text-medium-emphasis mb-0">{{ t('friendsPage.qr.showHint') }}</p>
                        <v-img v-if="qrDataUrl" :src="qrDataUrl" width="240" height="240" class="friend-qr-panel__img" />
                        <v-progress-circular v-else indeterminate color="primary" size="32" />
                        <div v-if="publicId" class="text-subtitle-1 font-weight-semibold textPrimary">
                            {{ t('friendsPage.qr.yourId', { id: publicId }) }}
                        </div>
                    </template>
                </div>
            </v-window-item>

            <v-window-item value="Add">
                <div class="friend-qr-panel d-flex flex-column align-center ga-3 py-2">
                    <p class="text-body-2 text-medium-emphasis text-center mb-0">{{ t('friendsPage.qr.scanHint') }}</p>

                    <AppAlert v-if="scanError" type="warning" density="default" class="w-100">
                        {{ scanError }}
                    </AppAlert>

                    <v-btn v-if="cameraNeedsEnable && !cameraStarting" color="primary" flat @click="startScanner">
                        <CameraIcon class="mr-2" size="18" stroke-width="1.5" />
                        {{ t('friendsPage.qr.enableCamera') }}
                    </v-btn>

                    <div v-if="!cameraNeedsEnable || cameraStarting || scannerReady" class="friend-qr-scanner-wrap">
                        <div v-if="cameraStarting" class="friend-qr-scanner-loading">
                            <v-progress-circular indeterminate color="primary" size="36" />
                            <p class="text-body-2 text-medium-emphasis mb-0">{{ t('friendsPage.qr.enableCamera') }}…</p>
                        </div>
                        <div
                            :id="scannerElementId"
                            ref="scannerHost"
                            class="friend-qr-scanner"
                            :class="{ 'friend-qr-scanner--ready': scannerReady }"
                        />
                    </div>
                </div>
            </v-window-item>
        </v-window>

        <template #footer="{ close }">
            <v-spacer />
            <v-btn color="primary" flat @click="close">{{ t('common.close') }}</v-btn>
        </template>
    </AppModalBase>
</template>

<style scoped>
.friend-qr-tabs {
    padding-inline: 8px;
}

.friend-qr-tabs :deep(.v-slide-group__content) {
    justify-content: flex-start;
}

.friend-qr-tabs :deep(.v-tabs-bar),
.friend-qr-tabs :deep(.v-toolbar),
.friend-qr-tabs :deep(.v-tabs) {
    background: transparent !important;
}

.friend-qr-panel {
    min-height: 240px;
}

.friend-qr-panel__img {
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}

.friend-qr-scanner-wrap {
    position: relative;
    width: 100%;
    max-width: 320px;
}

.friend-qr-scanner {
    width: 100%;
    min-height: 240px;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(var(--v-theme-on-surface), 0.06);
}

.friend-qr-scanner-loading {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border-radius: 8px;
    background: rgba(var(--v-theme-surface), 0.92);
}

.friend-qr-scanner :deep(video) {
    width: 100%;
    border-radius: 8px;
}
</style>
