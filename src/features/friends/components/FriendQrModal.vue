<script setup lang="ts">
/**
 * Modal QR amis : afficher mon publicId en QR, scanner un autre utilisateur.
 */
defineOptions({ name: 'FriendQrModal' });

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CameraIcon, QrcodeIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppBaseTabs from '@/components/shared/tabs/AppBaseTabs.vue';
import { useAuthStore } from '@/features/auth';
import { useFriendQrGenerate } from '@/features/friends/composables/useFriendQrGenerate';
import { useFriendQrScan } from '@/features/friends/composables/useFriendQrScan';

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

const open = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value)
});

const view = ref<FriendQrView>('Qr');
const qrTabs = computed(() => [
    { value: 'Qr', label: t('friendsPage.qr.tabs.qr'), icon: QrcodeIcon },
    { value: 'Add', label: t('friendsPage.qr.tabs.add'), icon: CameraIcon }
]);

const publicId = computed(() => auth.user?.userPublicId?.trim().toUpperCase() || '');

const generate = useFriendQrGenerate({ publicId });
const {
    scannerHost,
    scanError,
    scannerReady,
    cameraStarting,
    cameraNeedsEnable,
    scannerElementId,
    startScanner
} = useFriendQrScan({
    modelValue: () => props.modelValue,
    view,
    publicId,
    onScanned: (id) => emit('scanned', id),
    onClose: () => {
        open.value = false;
    },
    refreshScrollbar: () => modalRef.value?.refreshScrollbar()
});

function onOpenChange(value: boolean) {
    open.value = value;
}

watch(
    () => props.modelValue,
    async (isOpen) => {
        if (isOpen) {
            view.value = 'Qr';
            await generate.generateQr();
            await modalRef.value?.refreshScrollbar();
            return;
        }
        view.value = 'Qr';
    }
);
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
            <div class="friend-qr-modal__tabs">
                <AppBaseTabs v-model="view" :tabs="qrTabs" align-tabs="center" :show-panels="false" />
            </div>
        </template>

        <v-window v-model="view">
            <v-window-item value="Qr">
                <div class="friend-qr-panel d-flex flex-column align-center text-center ga-3 py-2">
                    <AppAlert v-if="generate.qrError" type="error" density="default" class="w-100" closable @dismiss="generate.qrError = null">
                        {{ generate.qrError }}
                    </AppAlert>
                    <template v-else>
                        <p class="text-body-2 text-medium-emphasis mb-0">{{ t('friendsPage.qr.showHint') }}</p>
                        <v-img v-if="generate.qrDataUrl" :src="generate.qrDataUrl" width="240" height="240" class="friend-qr-panel__img" />
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
.friend-qr-modal__tabs {
    display: flex;
    justify-content: center;
    padding: 4px;
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
