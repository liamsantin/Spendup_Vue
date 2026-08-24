import { computed, reactive, ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useI18n } from 'vue-i18n';
import QRCode from 'qrcode';
import { buildFriendQrPayload } from '@/features/friends/qr';

export function useFriendQrGenerate(options: { publicId: MaybeRefOrGetter<string> }) {
    const { t } = useI18n();
    const qrDataUrl = ref<string | null>(null);
    const qrError = ref<string | null>(null);

    const publicId = computed(() => toValue(options.publicId));

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

    return reactive({
        qrDataUrl,
        qrError,
        generateQr
    });
}
