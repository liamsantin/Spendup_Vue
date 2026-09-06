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
    { value: 'Qr' as const, label: t('friendsPage.qr.tabs.qr'), icon: QrcodeIcon },
    { value: 'Add' as const, label: t('friendsPage.qr.tabs.add'), icon: CameraIcon }
]);

const publicId = computed(() => auth.user?.userPublicId?.trim().toUpperCase() || '');

const generate = useFriendQrGenerate({ publicId });
const { scannerHost, scanError, scannerReady, cameraStarting, cameraNeedsEnable, scannerElementId, startScanner } = useFriendQrScan({
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
            <div class="app-modal-tabs__toolbar">
                <nav class="app-modal-tabs__nav" :aria-label="t('friendsPage.qr.title')">
                    <button
                        v-for="item in qrTabs"
                        :key="item.value"
                        type="button"
                        class="app-modal-tabs__tab"
                        :class="{ 'is-active': view === item.value }"
                        :aria-current="view === item.value ? 'page' : undefined"
                        @click="view = item.value"
                    >
                        <component :is="item.icon" v-if="item.icon" :size="16" stroke-width="1.6" />
                        {{ item.label }}
                    </button>
                </nav>
            </div>
        </template>

        <v-window v-model="view">
            <v-window-item value="Qr">
                <div class="friend-qr-panel d-flex flex-column align-center text-center ga-3 py-2">
                    <AppAlert
                        v-if="generate.qrError"
                        type="error"
                        class="w-100"
                        closable
                        @dismiss="generate.qrError = null"
                    >
                        {{ generate.qrError }}
                    </AppAlert>
                    <template v-else>
                        <p class="text-body-2 text-medium-emphasis mb-0">{{ t('friendsPage.qr.showHint') }}</p>
                        <v-img v-if="generate.qrDataUrl" :src="generate.qrDataUrl" width="240" height="240" class="friend-qr-panel__img" />
                        <span v-else class="su-spin" />
                        <div v-if="publicId" class="text-subtitle-1 font-weight-semibold">
                            {{ t('friendsPage.qr.yourId', { id: publicId }) }}
                        </div>
                    </template>
                </div>
            </v-window-item>

            <v-window-item value="Add">
                <div class="friend-qr-panel d-flex flex-column align-center ga-3 py-2">
                    <p class="text-body-2 text-medium-emphasis text-center mb-0">{{ t('friendsPage.qr.scanHint') }}</p>

                    <AppAlert v-if="scanError" type="warning" class="w-100">
                        {{ scanError }}
                    </AppAlert>

                    <button v-if="cameraNeedsEnable && !cameraStarting" type="button" class="su-btn su-btn--ink" @click="startScanner">
                        <CameraIcon size="18" stroke-width="1.5" />
                        {{ t('friendsPage.qr.enableCamera') }}
                    </button>

                    <div v-if="!cameraNeedsEnable || cameraStarting || scannerReady" class="friend-qr-scanner-wrap">
                        <div v-if="cameraStarting" class="friend-qr-scanner-loading">
                            <span class="su-spin" />
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
            <button type="button" class="su-btn su-btn--ink" @click="close">{{ t('common.close') }}</button>
        </template>
    </AppModalBase>
</template>

<style scoped>
.app-modal-tabs__toolbar {
    display: flex;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 4px 24px 10px;
    box-sizing: border-box;
}

.app-modal-tabs__nav {
    display: flex;
    flex-wrap: nowrap;
    gap: 3px;
    width: fit-content;
    max-width: 100%;
    min-width: 0;
    padding: 4px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    border: 1px solid rgba(var(--v-theme-primary), 0.11);
    border-radius: 14px;
    background: rgba(var(--v-theme-primary), 0.045);
}

.app-modal-tabs__nav::-webkit-scrollbar {
    display: none;
}

.app-modal-tabs__tab {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 12px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--ink-mute);
    font: inherit;
    font-size: 13.5px;
    font-weight: 550;
    letter-spacing: -0.01em;
    white-space: nowrap;
    cursor: pointer;
    transition:
        background 0.25s var(--ease),
        color 0.25s var(--ease),
        box-shadow 0.25s var(--ease);
}

.app-modal-tabs__tab:hover:not(:disabled):not(.is-active) {
    color: var(--ink);
    background: rgba(255, 255, 255, 0.48);
}

.app-modal-tabs__tab.is-active {
    color: rgb(var(--v-theme-primary));
    background: var(--surface-raised);
    box-shadow:
        0 1px 2px rgba(16, 16, 20, 0.08),
        0 5px 14px -8px rgba(16, 16, 20, 0.38);
}

.app-modal-tabs__tab:disabled {
    opacity: 0.4;
    cursor: default;
}

.app-modal-tabs__tab svg {
    flex: none;
    opacity: 0.75;
}

.friend-qr-panel {
    min-height: 240px;
}

.friend-qr-panel__img {
    border-radius: 16px;
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
    border-radius: 16px;
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
    border-radius: 16px;
    background: rgba(var(--v-theme-surface), 0.92);
}

.friend-qr-scanner :deep(video) {
    width: 100%;
    border-radius: 16px;
}
</style>
