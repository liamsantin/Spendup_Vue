<script setup lang="ts">
/**
 * Parcours « Espaces partagés » : espace famille avec rôles, budget commun et dépenses réparties
 * (desktop) + soldes entre membres (mobile).
 */
import { ArrowRightIcon, EyeIcon, ShoppingCartIcon } from 'vue-tabler-icons';
import MockPhone from '../MockPhone.vue';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';
import { swissNumber } from '../format';

const members = [
    { initials: 'MR', name: 'Marc', role: 'Admin', tone: 'primary' },
    { initials: 'SR', name: 'Sophie', role: 'Admin', tone: 'violet' },
    { initials: 'HR', name: 'Hugo', role: 'Membre', tone: 'teal' },
    { initials: 'NR', name: 'Nina', role: 'Membre', tone: 'amber' },
    { initials: 'LR', name: 'Léa', role: 'Lecture', tone: 'green' }
];

const roleTone: Record<string, string> = { Admin: 'primary', Membre: 'slate', Lecture: 'green' };

const expenses = [
    { initials: 'MR', tone: 'primary', title: 'Courses du week-end · Coop', label: 'Payé par Marc · réparti 50/50', amount: 186.4 },
    { initials: 'SR', tone: 'violet', title: 'Électricité · SI Nyon', label: 'Payé par Sophie · réparti 50/50', amount: 128.6 },
    { initials: 'HR', tone: 'teal', title: 'Pizza du vendredi', label: 'Payé par Hugo · réparti en 4', amount: 64.8 }
];

const settlements = [
    { from: 'SR', fromTone: 'violet', to: 'MR', toTone: 'primary', title: 'Sophie → Marc', label: '22 sept. · TWINT', amount: 120 },
    { from: 'HR', fromTone: 'teal', to: 'LR', toTone: 'green', title: 'Hugo → Léa', label: '19 sept. · virement', amount: 25 }
];
</script>

<template>
    <MockStage
        label="Espace partagé de la famille Rochat dans Spendup : membres et rôles, budget commun, dépenses réparties et soldes entre membres"
    >
        <MockWindow title="Spendup · Espace Famille Rochat" style="left: 1.2em; top: 2.4em; width: 30em; height: 27.2em">
            <div class="mk-between" style="margin-bottom: 0.9em; width: 25.8em">
                <div>
                    <span class="mk-eyebrow">Espace partagé</span>
                    <span class="mk-title" style="font-size: 1.1em; margin-top: 0.2em">Famille Rochat</span>
                </div>
                <span class="mk-chip mk-tone-slate">5 membres</span>
            </div>

            <div class="mk-card shared-members">
                <div v-for="m in members" :key="m.name" class="shared-member">
                    <span class="mk-avatar" :class="`mk-tone-${m.tone}`">{{ m.initials }}</span>
                    <span class="mk-title">{{ m.name }}</span>
                    <span class="mk-chip" :class="`mk-tone-${roleTone[m.role]}`">{{ m.role }}</span>
                </div>
            </div>

            <div class="mk-card" style="position: relative; width: 25.8em; margin-top: 0.6em; padding: 0.75em 1.1em 0.85em">
                <div class="mk-between">
                    <span class="mk-flex" style="gap: 0.55em">
                        <span class="mk-ico mk-ico--sm mk-tone-primary"><ShoppingCartIcon /></span>
                        <span>
                            <span class="mk-title" style="font-size: 0.8em">Courses du foyer</span>
                            <span class="mk-label" style="font-size: 0.62em; margin-top: 0.1em"
                                >Budget commun · 68 % · reste CHF 287.20</span
                            >
                        </span>
                    </span>
                    <span class="shared-amount"><b>CHF 612.80</b><span> / 900</span></span>
                </div>
                <div class="mk-bar mk-tone-primary" style="margin-top: 0.6em; height: 0.42em"><i style="width: 68%"></i></div>
            </div>

            <div class="mk-card" style="position: relative; width: 25.8em; margin-top: 0.6em; padding: 0.2em 1.1em">
                <div class="mk-list">
                    <div v-for="e in expenses" :key="e.title" class="mk-row" style="min-height: 2.6em">
                        <span class="mk-avatar" :class="`mk-tone-${e.tone}`" style="font-size: 0.66em">{{ e.initials }}</span>
                        <div class="mk-row__main">
                            <span class="mk-title">{{ e.title }}</span>
                            <span class="mk-label">{{ e.label }}</span>
                        </div>
                        <span class="mk-row__end mk-amount">CHF {{ swissNumber(e.amount) }}</span>
                    </div>
                </div>
            </div>
        </MockWindow>

        <MockPhone class="mk-bob" style="left: 29.8em; top: 1.7em">
            <span class="mk-eyebrow">Famille Rochat</span>
            <span class="mk-title" style="font-size: 1.02em; margin-top: 0.2em">Soldes entre membres</span>

            <div class="mk-card" style="position: relative; margin-top: 0.6em; padding: 0.75em 0.9em 0.7em">
                <div class="mk-flex" style="gap: 0.55em">
                    <span class="mk-avatar mk-tone-green" style="font-size: 0.72em">LR</span>
                    <span class="mk-sub" style="font-size: 0.7em">Léa te doit</span>
                </div>
                <span class="mk-kpi" style="font-size: 1.5em; margin-top: 0.35em"><small>CHF</small>43.20</span>
                <span class="mk-label" style="font-size: 0.6em; margin-top: 0.2em">Courses du week-end et cinéma</span>
                <span class="shared-btn shared-btn--ghost">Envoyer un rappel</span>
            </div>

            <div class="mk-card" style="position: relative; margin-top: 0.5em; padding: 0.65em 0.9em">
                <div class="mk-between">
                    <div class="mk-flex" style="gap: 0.55em">
                        <span class="mk-avatar mk-tone-teal" style="font-size: 0.72em">HR</span>
                        <span>
                            <span class="mk-sub" style="font-size: 0.66em">Tu dois à Hugo</span>
                            <span class="mk-amount" style="display: block; font-size: 0.86em; margin-top: 0.1em">CHF 16.20</span>
                        </span>
                    </div>
                </div>
                <span class="shared-btn shared-btn--dark">Rembourser</span>
            </div>

            <span class="mk-eyebrow" style="margin: 0.7em 0 0.25em">Derniers règlements</span>
            <div class="mk-card" style="position: relative; padding: 0.1em 0.75em">
                <div class="mk-list">
                    <div v-for="s in settlements" :key="s.title" class="mk-row" style="min-height: 2.5em; gap: 0.55em">
                        <span class="mk-avatars">
                            <span class="mk-avatar" :class="`mk-tone-${s.fromTone}`" style="font-size: 0.56em">{{ s.from }}</span>
                            <span class="mk-avatar" :class="`mk-tone-${s.toTone}`" style="font-size: 0.56em">{{ s.to }}</span>
                        </span>
                        <div class="mk-row__main">
                            <span class="mk-title" style="font-size: 0.7em">{{ s.title }}</span>
                            <span class="mk-label" style="font-size: 0.58em">{{ s.label }}</span>
                        </div>
                        <span class="mk-row__end mk-amount" style="font-size: 0.66em">{{ swissNumber(s.amount) }}</span>
                    </div>
                </div>
            </div>
        </MockPhone>

        <div class="mk-float mk-bob mk-bob--late" style="left: 2.6em; top: 29em">
            <span class="mk-ico mk-tone-green"><EyeIcon /></span>
            <div>
                <span class="mk-title">Permissions · Léa peut voir, pas modifier</span>
                <span class="mk-label">Rôle « Lecture » sur l’espace Famille</span>
            </div>
            <ArrowRightIcon class="shared-float-arrow" />
        </div>
    </MockStage>
</template>

<style scoped>
.shared-members {
    position: relative;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    width: 25.8em;
    padding: 0.85em 0.6em 0.8em;
}

.shared-member {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35em;
}

.shared-member + .shared-member {
    border-left: 0.06em solid var(--mk-line);
}

.shared-member .mk-avatar {
    font-size: 0.78em;
}

.shared-member .mk-title {
    font-size: 0.72em;
}

.shared-member .mk-chip {
    height: 1.6em;
    font-size: 0.56em;
}

.shared-amount {
    font-size: 0.74em;
    white-space: nowrap;
}

.shared-amount b {
    font-weight: 680;
}

.shared-amount span {
    color: var(--mk-muted);
    font-weight: 560;
}

.shared-btn {
    display: grid;
    place-items: center;
    height: 2.5em;
    margin-top: 0.9em;
    border-radius: 0.9em;
    font-size: 0.68em;
    font-weight: 680;
}

.shared-btn--ghost {
    color: rgb(var(--mk-primary));
    background: rgba(var(--mk-primary), 0.1);
}

.shared-btn--dark {
    color: #fff;
    background: #111a33;
    box-shadow: 0 0.6em 1.2em -0.6em rgba(17, 26, 51, 0.7);
}

.shared-float-arrow {
    width: 0.9em;
    height: 0.9em;
    color: var(--mk-muted);
}
</style>
