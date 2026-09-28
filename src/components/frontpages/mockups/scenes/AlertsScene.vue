<script setup lang="ts">
/**
 * « Alertes & notifications » : Spendup dans le navigateur, panneau de notifications ouvert
 * depuis la cloche de l'en-tête, et préférences (e-mail, application web, application Windows).
 */
import {
    AppWindowIcon,
    BellIcon,
    BellRingingIcon,
    CalendarDueIcon,
    DeviceLaptopIcon,
    MailIcon,
    SearchIcon,
    ShoppingCartIcon,
    TargetIcon
} from 'vue-tabler-icons';
import MockStage from '../MockStage.vue';
import MockWindow from '../MockWindow.vue';

const notifications = [
    {
        icon: ShoppingCartIcon,
        tone: 'amber',
        time: 'À l’instant',
        title: 'Budget Courses à 92 %',
        body: 'Il reste CHF 56 jusqu’au 30 sept.',
        unread: true
    },
    { icon: CalendarDueIcon, tone: 'red', time: '8:00', title: 'Échéance demain', body: 'Assurance maladie · CHF 412.80', unread: true },
    { icon: TargetIcon, tone: 'green', time: 'Hier', title: 'Objectif atteint', body: 'Voyage au Japon · CHF 5’000', unread: false },
    {
        icon: DeviceLaptopIcon,
        tone: 'violet',
        time: 'Sam.',
        title: 'Nouvelle connexion',
        body: 'Navigateur sur ordinateur · Lausanne',
        unread: false
    }
];

const channels = [
    { icon: MailIcon, tone: 'primary', title: 'E-mail', label: 'lea.muller@exemple.ch', on: true },
    { icon: BellRingingIcon, tone: 'violet', title: 'Dans l’application', label: 'Web et mobile', on: true },
    { icon: AppWindowIcon, tone: 'teal', title: 'Application Windows', label: 'Notifications du bureau', on: false }
];
</script>

<template>
    <MockStage label="Spendup dans le navigateur : panneau de notifications et préférences d’alerte">
        <MockWindow title="Spendup · Tableau de bord" style="left: 1.2em; top: 2.6em; width: 25.8em; height: 28.4em">
            <div class="al-header">
                <span class="al-search"><SearchIcon /> Rechercher…</span>
                <span class="al-bell">
                    <BellIcon />
                    <b>2</b>
                </span>
                <span class="mk-avatar mk-tone-violet" style="width: 1.8em; height: 1.8em; font-size: 0.7em">LM</span>
            </div>

            <div class="al-page" aria-hidden="true">
                <i style="width: 40%"></i>
                <i style="width: 100%; height: 6em"></i>
                <i style="width: calc(50% - 0.3em); height: 7.5em"></i>
                <i style="width: calc(50% - 0.3em); height: 7.5em"></i>
            </div>

            <div class="mk-card mk-card--lg al-panel">
                <div class="mk-between al-panel__head">
                    <span class="mk-title">Notifications</span>
                    <span class="mk-chip mk-tone-primary">2 nouvelles</span>
                </div>
                <div class="mk-list">
                    <div v-for="n in notifications" :key="n.title" class="mk-row al-notif" :class="{ 'is-unread': n.unread }">
                        <span class="mk-ico mk-ico--sm" :class="`mk-tone-${n.tone}`"><component :is="n.icon" /></span>
                        <div class="mk-row__main">
                            <span class="mk-title">{{ n.title }}</span>
                            <span class="mk-label">{{ n.body }}</span>
                        </div>
                        <span class="al-notif__time">{{ n.time }}</span>
                    </div>
                </div>
                <span class="al-panel__all">Toutes les notifications</span>
            </div>
        </MockWindow>

        <div class="mk-card mk-card--lg mk-card--pad" style="left: 27.8em; top: 3.4em; width: 17em">
            <span class="mk-title">Préférences d’alerte</span>
            <span class="mk-label" style="margin: 0.2em 0 0.6em">Où voulez-vous être prévenu ?</span>
            <div class="mk-list">
                <div v-for="c in channels" :key="c.title" class="mk-row">
                    <span class="mk-ico mk-ico--sm" :class="`mk-tone-${c.tone}`"><component :is="c.icon" /></span>
                    <div class="mk-row__main">
                        <span class="mk-title">{{ c.title }}</span>
                        <span class="mk-label">{{ c.label }}</span>
                    </div>
                    <span class="al-toggle" :class="{ 'is-on': c.on }"><i></i></span>
                </div>
            </div>
        </div>

        <div class="mk-float mk-bob mk-bob--late" style="left: 28.4em; top: 19.8em">
            <span class="mk-ico mk-tone-amber"><ShoppingCartIcon /></span>
            <div style="width: 11em">
                <div class="mk-between">
                    <span class="mk-title">Seuil d’alerte budget</span>
                    <span class="mk-title" style="color: rgb(var(--mk-amber))">90 %</span>
                </div>
                <div class="al-slider"><i style="width: 90%"></i><b style="left: 90%"></b></div>
            </div>
        </div>
    </MockStage>
</template>

<style scoped>
.al-header {
    display: flex;
    align-items: center;
    gap: 0.7em;
    height: 2.6em;
    padding: 0 0.7em;
    border-radius: 0.9em;
    background: #fff;
    box-shadow: var(--mk-shadow);
}

.al-search {
    display: flex;
    align-items: center;
    gap: 0.4em;
    flex: 1;
    color: var(--mk-muted);
    font-size: 0.68em;
}

.al-search svg,
.al-bell svg {
    width: 1.2em;
    height: 1.2em;
}

.al-bell {
    position: relative;
    display: grid;
    place-items: center;
    width: 1.9em;
    height: 1.9em;
    border-radius: 50%;
    color: rgb(var(--mk-primary));
    background: rgba(var(--mk-primary), 0.12);
}

.al-bell b {
    position: absolute;
    top: -0.3em;
    right: -0.3em;
    display: grid;
    place-items: center;
    min-width: 1.35em;
    height: 1.35em;
    border: 0.14em solid #fff;
    border-radius: 99em;
    color: #fff;
    font-size: 0.55em;
    background: rgb(var(--mk-red));
}

/* page d'arrière-plan, volontairement estompée sous le panneau */
.al-page {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6em;
    margin-top: 0.9em;
    opacity: 0.55;
}

.al-page i {
    display: block;
    height: 1.2em;
    border-radius: 0.6em;
    background: #fff;
}

.al-panel {
    top: 4.1em;
    right: 1em;
    width: 19em;
    padding: 0.9em 1em 0.8em;
}

.al-panel__head {
    margin-bottom: 0.3em;
}

.al-notif {
    position: relative;
}

.al-notif.is-unread::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -0.55em;
    width: 0.32em;
    height: 0.32em;
    border-radius: 50%;
    background: rgb(var(--mk-primary));
    transform: translateY(-50%);
}

.al-notif__time {
    flex: none;
    align-self: flex-start;
    margin-top: 0.3em;
    color: var(--mk-muted);
    font-size: 0.58em;
    font-weight: 600;
}

.al-panel__all {
    display: block;
    margin-top: 0.5em;
    padding-top: 0.6em;
    border-top: 0.06em solid var(--mk-line);
    color: rgb(var(--mk-primary));
    font-size: 0.68em;
    font-weight: 650;
    text-align: center;
}

.al-toggle {
    position: relative;
    flex: none;
    width: 2.3em;
    height: 1.3em;
    border-radius: 99em;
    background: rgba(17, 26, 51, 0.14);
}

.al-toggle i {
    position: absolute;
    top: 0.15em;
    left: 0.15em;
    width: 1em;
    height: 1em;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0.1em 0.25em rgba(17, 26, 51, 0.25);
}

.al-toggle.is-on {
    background: rgb(var(--mk-primary));
}

.al-toggle.is-on i {
    left: 1.15em;
}

.al-slider {
    position: relative;
    height: 0.4em;
    margin-top: 0.55em;
    border-radius: 99em;
    background: rgba(17, 26, 51, 0.08);
}

.al-slider i {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: linear-gradient(90deg, rgba(var(--mk-amber), 0.7), rgb(var(--mk-amber)));
}

.al-slider b {
    position: absolute;
    top: 50%;
    width: 0.95em;
    height: 0.95em;
    border: 0.18em solid rgb(var(--mk-amber));
    border-radius: 50%;
    background: #fff;
    transform: translate(-50%, -50%);
}
</style>
