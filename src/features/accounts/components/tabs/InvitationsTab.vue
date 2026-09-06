<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { InboxIcon } from 'vue-tabler-icons';
import { useDisplay } from 'vuetify';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import { shouldVirtualize } from '@/utils/helpers/list-virtualization';
import { useAccountsStore } from '@/features/accounts/stores/accounts-store';
import IncomingShareListItem from '@/features/accounts/components/list/IncomingShareListItem.vue';

const { t } = useI18n();
const { smAndDown } = useDisplay();
const store = useAccountsStore();

function useVirtualList(length: number) {
    if (store.focusSharePublicId) return false;
    return !smAndDown.value && shouldVirtualize(length);
}
</script>

<template>
    <div>
        <AppAlert
            v-if="store.error"
            type="error"
            class="su-alert"
            closable
            :dismiss-ms="3000"
            @dismiss="store.clearError()"
        >
            {{ store.error }}
        </AppAlert>

        <section class="su-surface">
            <header class="su-panel__head">
                <span class="su-panel__icon"><InboxIcon :size="20" stroke-width="1.5" /></span>
                <div>
                    <h2>{{ t('comptesPage.invitations.title') }}</h2>
                    <p>{{ t('comptesPage.invitations.subtitle') }}</p>
                </div>
                <span v-if="store.incomingCount > 0" class="su-panel__chip">{{ store.incomingCount }}</span>
            </header>

            <div v-if="store.loadingIncoming && !store.incomingShares.length" class="su-loading">
                <span class="su-spin" />
            </div>
            <div v-else-if="!store.incomingShares.length" class="su-empty">
                {{ t('comptesPage.empty.invitations') }}
            </div>
            <v-virtual-scroll
                v-else-if="useVirtualList(store.incomingShares.length)"
                :items="store.incomingShares"
                height="480"
                :item-height="120"
                class="py-0"
            >
                <template #default="{ item }">
                    <IncomingShareListItem :invite="item" />
                </template>
            </v-virtual-scroll>
            <v-list v-else class="py-0">
                <IncomingShareListItem v-for="invite in store.incomingShares" :key="invite.publicId" :invite="invite" />
            </v-list>
        </section>
    </div>
</template>
