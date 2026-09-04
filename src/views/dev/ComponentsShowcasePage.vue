<script setup lang="ts">
/**
 * Showcase du kit verre Spend.Up (dev only, /components).
 */
defineOptions({ name: 'ComponentsShowcasePage' });

import { ref } from 'vue';
import { BellPlusIcon, BuildingBankIcon, ChecksIcon, PlusIcon, SearchIcon, UserCircleIcon, XIcon } from 'vue-tabler-icons';
import AppAlert from '@/components/shared/alert/AppAlert.vue';
import AppChip from '@/components/shared/chip/AppChip.vue';
import AppColorPicker from '@/components/shared/color-picker/AppColorPicker.vue';
import AppConfirmationModal from '@/components/shared/modal/AppConfirmationModal.vue';
import AppDatePicker from '@/components/shared/date-picker/AppDatePicker.vue';
import AppDropdownFilter from '@/components/shared/dropdown-filter/AppDropdownFilter.vue';
import AppGlassCard from '@/components/shared/card/AppGlassCard.vue';
import AppModalBase from '@/components/shared/modal/AppModalBase.vue';
import AppModalPanelScroll from '@/components/shared/modal/AppModalPanelScroll.vue';
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue';
import AppRadioButton from '@/components/shared/radio/AppRadioButton.vue';
import AppSwitch from '@/components/shared/switch/AppSwitch.vue';
import AppTabsShell from '@/components/shared/tabs/AppTabsShell.vue';
import { ACCOUNT_COLOR_PRESETS } from '@/features/accounts/types';

const tab = ref('chrome');
const tabs = [
    { value: 'chrome', label: 'Chrome' },
    { value: 'surfaces', label: 'Surfaces' },
    { value: 'forms', label: 'Formulaires' },
    { value: 'lists', label: 'Listes' },
    { value: 'modals', label: 'Modales' },
    { value: 'feedback', label: 'Feedback' }
];

const pageTab = ref('Accounts');
const pageTabs = [
    { value: 'Accounts', label: 'Comptes', icon: BuildingBankIcon },
    { value: 'Invitations', label: 'Invitations', icon: BellPlusIcon, chip: 2 }
];

const modalTab = ref('one');
const modalTabs = [
    { value: 'one', label: 'Détails' },
    { value: 'two', label: 'Partages', chip: 1 },
    { value: 'three', label: 'Sécurité' }
];

const modalBaseOpen = ref(false);
const modalTabsOpen = ref(false);
const confirmationOpen = ref(false);
const confirmationDangerOpen = ref(false);

const switchOn = ref(true);
const switchOff = ref(false);
const radioRole = ref('viewer');
const dateValue = ref<string | null>('1998-04-12');
const colorValue = ref<string | null>(ACCOUNT_COLOR_PRESETS[0]);
const chipVisible = ref(true);
const filterHidden = ref(false);
</script>

<template>
    <div class="su-showcase">
        <AppTabsShell
            v-model="tab"
            :tabs="tabs"
            title="Composants"
            subtitle="Kit verre de l’application — page interne (VITE_APP_ENV=development)."
            hide-actions
            embedded
        >
            <div v-if="tab === 'chrome'" class="su-showcase__grid">
                <AppGlassCard title="Onglets page" subtitle="su-tabs — pastille à la couleur du thème.">
                    <nav class="su-tabs" aria-label="Démo onglets">
                        <button
                            v-for="item in pageTabs"
                            :key="item.value"
                            type="button"
                            class="su-tab"
                            :class="{ 'is-active': pageTab === item.value }"
                            @click="pageTab = item.value"
                        >
                            <component :is="item.icon" :size="18" stroke-width="1.6" />
                            {{ item.label }}
                            <span v-if="item.chip" class="su-tab__chip">{{ item.chip }}</span>
                        </button>
                    </nav>
                </AppGlassCard>

                <AppGlassCard title="Boutons" subtitle="su-btn, su-orb.">
                    <div class="su-showcase__row">
                        <button type="button" class="su-btn su-btn--ink">
                            <PlusIcon :size="16" stroke-width="1.6" />
                            Enregistrer
                        </button>
                        <button type="button" class="su-btn su-btn--ghost">Annuler</button>
                        <button type="button" class="su-btn">Secondaire</button>
                        <button type="button" class="su-btn su-btn--danger">Supprimer</button>
                        <button type="button" class="su-btn su-btn--warn">Attention</button>
                        <button type="button" class="su-btn su-btn--ink" disabled>Désactivé</button>
                    </div>
                    <div class="su-showcase__row" style="margin-top: 12px">
                        <button type="button" class="su-orb" aria-label="Rechercher">
                            <SearchIcon :size="18" stroke-width="1.5" />
                        </button>
                        <button type="button" class="su-orb" aria-label="Tout lu">
                            <ChecksIcon :size="18" stroke-width="1.5" />
                        </button>
                        <button type="button" class="su-orb su-orb--danger" aria-label="Fermer">
                            <XIcon :size="18" stroke-width="1.5" />
                        </button>
                    </div>
                </AppGlassCard>

                <AppGlassCard title="Chips" subtitle="su-chip et AppChip.">
                    <div class="su-showcase__row">
                        <span class="su-chip">Principal</span>
                        <span class="su-chip">2 non lus</span>
                        <AppChip color="success" variant="tonal">Succès</AppChip>
                        <AppChip v-if="chipVisible" closable @dismiss="chipVisible = false">Fermable</AppChip>
                        <button v-if="!chipVisible" type="button" class="su-btn su-btn--ghost" @click="chipVisible = true">
                            Réafficher
                        </button>
                    </div>
                </AppGlassCard>
            </div>

            <div v-else-if="tab === 'surfaces'" class="su-showcase__grid">
                <AppGlassCard title="Carte verre" subtitle="AppGlassCard — surface, icône, actions.">
                    <template #icon>
                        <UserCircleIcon :size="20" stroke-width="1.5" />
                    </template>
                    <template #actions>
                        <button type="button" class="su-btn su-btn--ink">Action</button>
                    </template>
                    <p style="margin: 0; color: var(--ink-muted); font-size: 13.5px; line-height: 1.5">
                        Corps de carte. Champs, listes et interrupteurs s’y empilent avec de l’air.
                    </p>
                </AppGlassCard>

                <AppGlassCard title="Danger" subtitle="Carte destructive." danger>
                    <template #icon>
                        <XIcon :size="20" stroke-width="1.5" />
                    </template>
                    <p style="margin: 0; color: var(--ink-muted); font-size: 13.5px">Zone sensible (suppression de compte, révocation).</p>
                </AppGlassCard>

                <div class="su-split">
                    <section class="su-surface">
                        <header class="su-panel__head">
                            <span class="su-panel__icon"><BuildingBankIcon :size="20" stroke-width="1.5" /></span>
                            <div>
                                <h2>Colonne gauche</h2>
                                <p>su-split + su-surface</p>
                            </div>
                        </header>
                        <div class="su-empty">Liste vide</div>
                    </section>
                    <section class="su-surface">
                        <header class="su-panel__head">
                            <span class="su-panel__icon"><BellPlusIcon :size="20" stroke-width="1.5" /></span>
                            <div>
                                <h2>Colonne droite</h2>
                                <p>Chargement</p>
                            </div>
                            <span class="su-panel__chip">3</span>
                        </header>
                        <div class="su-loading"><span class="su-spin" /></div>
                    </section>
                </div>
            </div>

            <div v-else-if="tab === 'forms'" class="su-showcase__grid">
                <AppGlassCard title="Interrupteurs" subtitle="AppSwitch — piste du thème, curseur blanc.">
                    <div class="su-showcase__row">
                        <AppSwitch v-model="switchOn" label="Activé" />
                        <AppSwitch v-model="switchOff" label="Inactif" />
                    </div>
                </AppGlassCard>

                <AppGlassCard title="Radios" subtitle="AppRadioButton.">
                    <AppRadioButton
                        v-model="radioRole"
                        :items="[
                            { title: 'Lecteur', value: 'viewer' },
                            { title: 'Éditeur', value: 'editor' }
                        ]"
                    />
                </AppGlassCard>

                <AppGlassCard title="Date" subtitle="AppDatePicker.">
                    <AppDatePicker v-model="dateValue" label="Date de naissance" />
                </AppGlassCard>

                <AppGlassCard title="Couleur" subtitle="AppColorPicker.">
                    <AppColorPicker v-model="colorValue" :colors="ACCOUNT_COLOR_PRESETS" label="Couleur du compte" />
                </AppGlassCard>

                <AppGlassCard title="Filtre" subtitle="AppDropdownFilter.">
                    <AppDropdownFilter label="Filtres">
                        <AppSwitch v-model="filterHidden" label="Masquer les archivés" class="px-3 py-2" />
                    </AppDropdownFilter>
                </AppGlassCard>
            </div>

            <div v-else-if="tab === 'lists'" class="su-showcase__grid">
                <AppGlassCard title="Ligne personne" subtitle="su-person — amis, notifications, invitations.">
                    <div class="su-person">
                        <span class="su-person__avatar su-person__avatar--tile">A</span>
                        <div class="su-person__meta">
                            <p class="su-person__name">Compte courant</p>
                            <p class="su-person__sub">CHF · N° 1</p>
                        </div>
                        <div class="su-person__actions">
                            <span class="su-chip">Principal</span>
                        </div>
                    </div>
                    <div class="su-person is-focused">
                        <span class="su-person__avatar" />
                        <div class="su-person__meta">
                            <p class="su-person__name">Lina Martin</p>
                            <p class="su-person__sub">@lina · focus / non lu</p>
                        </div>
                        <div class="su-person__actions">
                            <button type="button" class="su-btn su-btn--ink">Accepter</button>
                            <button type="button" class="su-btn su-btn--danger">Refuser</button>
                        </div>
                    </div>
                </AppGlassCard>
            </div>

            <div v-else-if="tab === 'modals'" class="su-showcase__grid">
                <AppGlassCard title="Modales" subtitle="AppModalBase, AppModalTabs, AppConfirmationModal.">
                    <div class="su-showcase__row">
                        <button type="button" class="su-btn su-btn--ink" @click="modalBaseOpen = true">Base</button>
                        <button type="button" class="su-btn" @click="modalTabsOpen = true">Onglets</button>
                        <button type="button" class="su-btn" @click="confirmationOpen = true">Confirmer</button>
                        <button type="button" class="su-btn su-btn--danger" @click="confirmationDangerOpen = true">Détruire</button>
                    </div>
                </AppGlassCard>

                <AppModalBase
                    v-model="modalBaseOpen"
                    title="Modale base"
                    subtitle="Header, body, footer verre."
                    :max-width="480"
                    :height="420"
                >
                    <p style="margin: 0; color: var(--ink-muted)">Contenu scrollable. Pied Annuler / Enregistrer.</p>
                    <template #footer="{ close }">
                        <button type="button" class="su-btn su-btn--ghost" @click="close">Annuler</button>
                        <button type="button" class="su-btn su-btn--ink" @click="close">Enregistrer</button>
                    </template>
                </AppModalBase>

                <AppModalTabs
                    v-model="modalTabsOpen"
                    v-model:tab="modalTab"
                    :tabs="modalTabs"
                    title="Modale à onglets"
                    subtitle="Onglets plats, pas de pastilles."
                >
                    <template #panel-one>
                        <AppModalPanelScroll>
                            <p style="margin: 0; color: var(--ink-muted)">Panneau détails.</p>
                        </AppModalPanelScroll>
                    </template>
                    <template #panel-two>
                        <AppModalPanelScroll>
                            <p style="margin: 0; color: var(--ink-muted)">Panneau partages.</p>
                        </AppModalPanelScroll>
                    </template>
                    <template #panel-three>
                        <AppModalPanelScroll>
                            <p style="margin: 0; color: var(--ink-muted)">Panneau sécurité.</p>
                        </AppModalPanelScroll>
                    </template>
                    <template #footer="{ close }">
                        <button type="button" class="su-btn su-btn--ghost" @click="close">Fermer</button>
                    </template>
                </AppModalTabs>

                <AppConfirmationModal
                    v-model="confirmationOpen"
                    title="Enregistrer les modifications ?"
                    message="Les changements non sauvés seront conservés."
                    @confirm="confirmationOpen = false"
                />
                <AppConfirmationModal
                    v-model="confirmationDangerOpen"
                    title="Supprimer ce compte ?"
                    message="Action irréversible."
                    confirm-color="error"
                    confirm-label="Supprimer"
                    @confirm="confirmationDangerOpen = false"
                />
            </div>

            <div v-else class="su-showcase__grid">
                <AppGlassCard title="Alertes" subtitle="AppAlert.">
                    <div class="su-showcase__grid" style="gap: 10px">
                        <AppAlert type="success" variant="tonal" density="default">Opération réussie.</AppAlert>
                        <AppAlert type="info" variant="tonal" density="default">Information utile.</AppAlert>
                        <AppAlert type="warning" variant="tonal" density="default">Vérifiez ce champ.</AppAlert>
                        <AppAlert type="error" variant="tonal" density="default" closable>Une erreur s’est produite.</AppAlert>
                    </div>
                </AppGlassCard>

                <AppGlassCard title="États" subtitle="su-empty, su-loading.">
                    <div class="su-empty">Aucune invitation en attente.</div>
                    <div class="su-loading" style="margin-top: 8px"><span class="su-spin" /></div>
                </AppGlassCard>
            </div>
        </AppTabsShell>
    </div>
</template>
