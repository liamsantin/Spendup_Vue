import { nextTick, onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Html5Qrcode } from 'html5-qrcode';
import { parseFriendQrPayload } from '../qr';

export function useFriendQrScan(options: {
    modelValue: MaybeRefOrGetter<boolean>;
    view: Ref<string>;
    publicId: MaybeRefOrGetter<string>;
    onScanned: (publicId: string) => void;
    onClose: () => void;
    refreshScrollbar: () => Promise<void> | void;
}) {
    const { t } = useI18n();
    const scannerHost = ref<HTMLElement | null>(null);

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
            await options.refreshScrollbar();
        }
    }

    async function onScanSuccess(decodedText: string) {
        if (handledScan) return;
        const id = parseFriendQrPayload(decodedText);
        if (!id) {
            scanError.value = t('friendsPage.qr.invalidQr');
            return;
        }
        const publicId = toValue(options.publicId);
        if (publicId && id === publicId) {
            scanError.value = t('friendsPage.qr.selfScan');
            return;
        }
        handledScan = true;
        await stopScanner();
        options.onClose();
        options.onScanned(id);
    }

    function resetCameraUi() {
        scanError.value = null;
        cameraNeedsEnable.value = true;
        cameraStarting.value = false;
        scannerReady.value = false;
    }

    watch(
        () => toValue(options.modelValue),
        async (isOpen) => {
            startGeneration += 1;
            if (isOpen) {
                handledScan = false;
                resetCameraUi();
                return;
            }
            await stopScanner();
            resetCameraUi();
        }
    );

    watch(options.view, async (value) => {
        if (!toValue(options.modelValue)) return;
        startGeneration += 1;
        if (value === 'Add') {
            resetCameraUi();
            await nextTick();
            await options.refreshScrollbar();
            return;
        }
        await stopScanner();
        resetCameraUi();
        await options.refreshScrollbar();
    });

    onBeforeUnmount(() => {
        startGeneration += 1;
        void stopScanner();
    });

    // Plain object (not reactive) so `scannerHost` stays a real template ref.
    return {
        scannerHost,
        scanError,
        scannerReady,
        cameraStarting,
        cameraNeedsEnable,
        scannerElementId,
        startScanner,
        stopScanner,
        resetCameraUi
    };
}
