<script setup lang="ts">
/**
 * Page « Provision d'impôts » : combien mettre de côté chaque mois, d'après la dernière décision de taxation ou un montant
 * annuel saisi. L'état et les appels vivent dans `TaxProvisionCard` ; la page explique la base et renvoie vers les impôts.
 */
import { computed, onMounted, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import AppPageShell from '@/components/shared/page-shell/AppPageShell.vue';
import TaxProvisionCard from '@/features/tax/components/TaxProvisionCard.vue';
import { TAX_BASE, taxDetailPath } from '@/features/tax/paths';
import { taxProvisionApi, type TaxProvision } from '@/features/tax/provision';

const { t } = useI18n();
const provision = shallowRef<TaxProvision | null>(null);

const returnLink = computed(() => (provision.value?.returnPublicId ? taxDetailPath(provision.value.returnPublicId) : null));

onMounted(async () => {
    try {
        provision.value = await taxProvisionApi.get();
    } catch {
        provision.value = null;
    }
});
</script>

<template>
    <AppPageShell :title="t('taxProvision.title')" :subtitle="t('taxProvision.pageSubtitle')">
        <div class="provision-page">
            <TaxProvisionCard :show-head="false" />

            <section class="su-section">
                <header class="su-section__head">
                    <h2>{{ t('taxProvision.howTitle') }}</h2>
                </header>
                <ul class="provision-page__how">
                    <li>{{ t('taxProvision.howDecision') }}</li>
                    <li>{{ t('taxProvision.howMonthly') }}</li>
                    <li>{{ t('taxProvision.howTyped') }}</li>
                    <li>{{ t('taxProvision.howNever') }}</li>
                </ul>
                <p class="provision-page__links">
                    <RouterLink v-if="returnLink" :to="returnLink" class="su-link">
                        {{ t('taxProvision.seeReturn', { year: provision?.referenceYear }) }}
                    </RouterLink>
                    <RouterLink v-else :to="TAX_BASE" class="su-link">{{ t('taxProvision.goToTax') }}</RouterLink>
                </p>
            </section>
        </div>
    </AppPageShell>
</template>

<style scoped>
.provision-page {
    display: grid;
    gap: 16px;
}

.provision-page__how {
    display: grid;
    gap: 8px;
    margin: 0;
    padding-left: 1.25rem;
    color: var(--gray);
    font-size: 0.875rem;
}

.provision-page__links {
    margin: 8px 0 0;
}
</style>
