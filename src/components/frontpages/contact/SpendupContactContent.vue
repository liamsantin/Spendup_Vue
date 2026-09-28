<script setup lang="ts">
import { computed, reactive, ref, type Component } from 'vue';
import {
    ArrowRightIcon,
    CheckIcon,
    CopyIcon,
    DatabaseExportIcon,
    LifebuoyIcon,
    MailIcon,
    MailOpenedIcon,
    MapPinIcon,
    SendIcon
} from 'vue-tabler-icons';
import {
    buildContactMailto,
    contactEmail,
    CONTACT_MESSAGE_MAX,
    CONTACT_NAME_MAX,
    CONTACT_SUBJECTS,
    validateContactForm,
    type ContactFormErrors,
    type ContactFormValues
} from './contact-form';

const email = contactEmail();

const form = reactive<ContactFormValues>({
    name: '',
    email: '',
    subject: 'question',
    message: '',
    consent: false
});

const errors = ref<ContactFormErrors>({});
const submitted = ref(false);
const sent = ref(false);
const copied = ref(false);

const messageLength = computed(() => form.message.trim().length);

function revalidate() {
    if (submitted.value) errors.value = validateContactForm(form);
}

function onSubmit() {
    submitted.value = true;
    errors.value = validateContactForm(form);
    if (Object.keys(errors.value).length || !email) return;
    window.location.href = buildContactMailto(email, form);
    sent.value = true;
}

function resetForm() {
    Object.assign(form, { name: '', email: '', subject: 'question', message: '', consent: false });
    errors.value = {};
    submitted.value = false;
    sent.value = false;
}

async function copyEmail() {
    if (!email) return;
    try {
        await navigator.clipboard.writeText(email);
        copied.value = true;
        window.setTimeout(() => (copied.value = false), 2000);
    } catch {
        // presse-papiers indisponible : l'adresse reste affichée et sélectionnable
    }
}

type ContactChannel = { icon: Component; title: string; text: string } & ({ action: 'copy' } | { to: string; linkLabel: string });

const channels = computed<ContactChannel[]>(() => [
    ...(email
        ? [
              {
                  icon: MailIcon,
                  title: 'Écrivez-nous',
                  text: 'Une question, une idée, un retour ? Nous lisons chaque message.',
                  action: 'copy' as const
              }
          ]
        : []),
    {
        icon: LifebuoyIcon,
        title: 'Déjà utilisateur ?',
        text: 'Précisez l’adresse e-mail de votre compte : nous retrouverons plus vite votre espace.',
        to: '/auth?tab=login',
        linkLabel: 'Se connecter'
    },
    {
        icon: DatabaseExportIcon,
        title: 'Vos données personnelles',
        text: 'Accès, export ou suppression : vos droits au sens de la nLPD, expliqués simplement.',
        to: '/politique-confidentialite',
        linkLabel: 'Politique de confidentialité'
    }
]);
</script>

<template>
    <div class="contact-page">
        <section class="contact-hero">
            <div class="contact-hero__grid" aria-hidden="true"></div>
            <v-container class="max-width-1218">
                <div class="contact-hero__copy">
                    <span class="contact-kicker su-hero-in">Contact</span>
                    <h1 class="textPrimary su-hero-in" style="--su-in-delay: 80ms">Une question ? <span>Parlons-en.</span></h1>
                    <p class="text-medium-emphasis su-hero-in" style="--su-in-delay: 160ms">
                        Support, données personnelles, presse ou partenariat : écrivez-nous, une personne de l’équipe Spendup vous répond
                        directement.
                    </p>
                </div>
            </v-container>
        </section>

        <section class="contact-main">
            <v-container class="max-width-1218">
                <div class="contact-layout">
                    <div class="contact-card">
                        <div v-if="sent" class="contact-sent" role="status">
                            <span class="contact-sent__icon"><MailOpenedIcon size="30" stroke-width="1.6" /></span>
                            <h2 class="textPrimary">Votre messagerie s’est ouverte</h2>
                            <p class="text-medium-emphasis">
                                Votre message est prêt : il ne reste plus qu’à l’envoyer depuis votre application de messagerie. Rien ne
                                s’est ouvert ? Écrivez-nous directement à
                                <a :href="`mailto:${email}`">{{ email }}</a
                                >.
                            </p>
                            <v-btn color="primary" variant="outlined" size="large" class="text-none" @click="resetForm">
                                Écrire un autre message
                            </v-btn>
                        </div>

                        <form v-else class="contact-form" novalidate @submit.prevent="onSubmit">
                            <header class="contact-form__head">
                                <h2 class="textPrimary">Envoyer un message</h2>
                                <p class="text-medium-emphasis">Tous les champs sont nécessaires pour vous répondre.</p>
                            </header>

                            <fieldset class="contact-subjects">
                                <legend>Votre demande concerne</legend>
                                <label
                                    v-for="subject in CONTACT_SUBJECTS"
                                    :key="subject.value"
                                    class="contact-subject"
                                    :class="{ 'is-active': form.subject === subject.value }"
                                >
                                    <input v-model="form.subject" type="radio" name="subject" :value="subject.value" />
                                    <CheckIcon v-if="form.subject === subject.value" size="15" stroke-width="2.4" />
                                    {{ subject.label }}
                                </label>
                            </fieldset>

                            <div class="contact-form__row">
                                <v-text-field
                                    v-model="form.name"
                                    label="Nom et prénom"
                                    variant="outlined"
                                    color="primary"
                                    autocomplete="name"
                                    :maxlength="CONTACT_NAME_MAX"
                                    :error-messages="errors.name"
                                    @update:model-value="revalidate"
                                />
                                <v-text-field
                                    v-model="form.email"
                                    label="Adresse e-mail"
                                    type="email"
                                    variant="outlined"
                                    color="primary"
                                    autocomplete="email"
                                    :error-messages="errors.email"
                                    @update:model-value="revalidate"
                                />
                            </div>

                            <v-textarea
                                v-model="form.message"
                                label="Votre message"
                                variant="outlined"
                                color="primary"
                                rows="6"
                                auto-grow
                                :maxlength="CONTACT_MESSAGE_MAX"
                                :counter="CONTACT_MESSAGE_MAX"
                                :counter-value="() => messageLength"
                                :error-messages="errors.message"
                                @update:model-value="revalidate"
                            />

                            <v-checkbox
                                v-model="form.consent"
                                color="primary"
                                density="comfortable"
                                :error-messages="errors.consent"
                                @update:model-value="revalidate"
                            >
                                <template #label>
                                    <span class="contact-consent">
                                        J’accepte que ces informations soient utilisées uniquement pour répondre à ma demande (voir la
                                        <RouterLink to="/politique-confidentialite" @click.stop>politique de confidentialité</RouterLink>).
                                    </span>
                                </template>
                            </v-checkbox>

                            <div class="contact-form__actions">
                                <v-btn type="submit" color="primary" size="x-large" flat class="text-none px-8" :disabled="!email">
                                    <SendIcon size="18" class="me-2" />
                                    Envoyer le message
                                </v-btn>
                                <span v-if="email" class="contact-form__hint">Ouvre votre messagerie avec le message pré-rempli.</span>
                                <span v-else class="contact-form__hint contact-form__hint--warn">
                                    Le formulaire sera disponible prochainement.
                                </span>
                            </div>
                        </form>
                    </div>

                    <aside class="contact-aside">
                        <article v-for="channel in channels" :key="channel.title" class="contact-channel">
                            <span class="contact-channel__icon"><component :is="channel.icon" size="21" stroke-width="1.7" /></span>
                            <div>
                                <h3 class="textPrimary">{{ channel.title }}</h3>
                                <p class="text-medium-emphasis">{{ channel.text }}</p>
                                <button v-if="'action' in channel && email" type="button" class="contact-channel__email" @click="copyEmail">
                                    <span>{{ email }}</span>
                                    <component :is="copied ? CheckIcon : CopyIcon" size="16" />
                                    <span class="contact-sr">{{ copied ? 'Adresse copiée' : 'Copier l’adresse' }}</span>
                                </button>
                                <RouterLink v-else-if="'to' in channel" :to="channel.to" class="contact-channel__link">
                                    {{ channel.linkLabel }}
                                    <ArrowRightIcon size="16" />
                                </RouterLink>
                            </div>
                        </article>

                        <div class="contact-swiss">
                            <svg viewBox="0 0 32 32" aria-hidden="true">
                                <rect width="32" height="32" rx="7" fill="#DA291C" />
                                <rect x="13" y="6" width="6" height="20" fill="#FFFFFF" />
                                <rect x="6" y="13" width="20" height="6" fill="#FFFFFF" />
                            </svg>
                            <div>
                                <strong>Une équipe et des données en Suisse</strong>
                                <span><MapPinIcon size="14" /> Hébergement chez Infomaniak, à Genève</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </v-container>
        </section>
    </div>
</template>

<style scoped lang="scss">
@use '@/scss/frontpages/pages/contact';
</style>
