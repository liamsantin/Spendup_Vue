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
                        <span class="app-modal-tabs__label">{{ item.label }}</span>
                    </button>
                </nav>
            </div>
        </template>

        <v-window v-model="view">
            <v-window-item value="Qr">
                <div class="friend-qr-panel d-flex flex-column align-center text-center ga-3 py-2">
                    <AppAlert v-if="generate.qrError" type="error" class="w-100" closable @dismiss="generate.qrError = null">
                        {{ generate.qrError }}
                    </AppAlert>
                    <template v-else>
                        <p class="friend-qr-panel__hint">{{ t('friendsPage.qr.showHint') }}</p>
                        <div class="friend-qr-panel__frame">
                            <img
                                v-if="generate.qrDataUrl"
                                :src="generate.qrDataUrl"
                                width="240"
                                height="240"
                                class="friend-qr-panel__img"
                                :alt="t('friendsPage.qr.title')"
                            />
                            <span v-else class="su-spin" />
                        </div>
                        <p v-if="publicId" class="friend-qr-panel__id">
                            {{ t('friendsPage.qr.yourId', { id: publicId }) }}
                        </p>
                    </template>
                </div>
            </v-window-item>

            <v-window-item value="Add">
                <div class="friend-qr-panel d-flex flex-column align-center ga-3 py-2">
                    <p class="friend-qr-panel__hint text-center">{{ t('friendsPage.qr.scanHint') }}</p>

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
                            <p>{{ t('friendsPage.qr.enableCamera') }}…</p>
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
/* onglets texte : actif = 700 souligné d’un trait 2 px noir, pas de pilule */
.app-modal-tabs__toolbar {
    display: flex;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 0 24px 12px;
    box-sizing: border-box;
}

.app-modal-tabs__nav {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: center;
    gap: 22px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    border: 0;
    background: transparent;
    box-sizing: border-box;
}

.app-modal-tabs__nav::-webkit-scrollbar {
    display: none;
}

.app-modal-tabs__tab {
    appearance: none;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 0 0 auto;
    min-width: 0;
    height: 40px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--gray);
    font: inherit;
    font-size: 14px;
    font-weight: 400;
    white-space: nowrap;
    cursor: pointer;
    transition:
        color 0.15s var(--ease),
        box-shadow 0.15s var(--ease);
}

.app-modal-tabs__tab:hover:not(:disabled):not(.is-active) {
    color: var(--ink);
}

.app-modal-tabs__tab.is-active {
    color: var(--ink);
    font-weight: 700;
    box-shadow: inset 0 -2px 0 var(--ink);
}

.app-modal-tabs__tab:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
}

.app-modal-tabs__tab:disabled {
    opacity: 0.4;
    cursor: default;
}

.app-modal-tabs__tab svg {
    flex: none;
}

.app-modal-tabs__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.friend-qr-panel {
    min-height: 240px;
}

.friend-qr-panel__hint {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
    line-height: 1.45;
}

/* code QR dans un carré à cadre 1 px noir ; fond blanc conservé pour la lecture caméra */
.friend-qr-panel__frame {
    display: grid;
    place-items: center;
    width: 264px;
    height: 264px;
    padding: 12px;
    border: 1px solid var(--ink);
    background: #fff;
}

.friend-qr-panel__img {
    width: 240px;
    height: 240px;
}

.friend-qr-panel__id {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
}

.friend-qr-scanner-wrap {
    position: relative;
    width: 100%;
    max-width: 320px;
}

.friend-qr-scanner {
    width: 100%;
    min-height: 240px;
    border: 1px solid var(--ink);
    overflow: hidden;
    background: var(--soft);
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
    background: var(--raise);
}

.friend-qr-scanner-loading p {
    margin: 0;
    color: var(--gray);
    font-size: 14px;
}

.friend-qr-scanner :deep(video) {
    display: block;
    width: 100%;
}
</style>
