import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarParticipantList } from '@/features/calendar/types';

const api = vi.hoisted(() => ({
    participants: vi.fn(),
    invite: vi.fn(),
    removeParticipant: vi.fn(),
    respond: vi.fn()
}));

vi.mock('@/features/calendar/api', () => ({ calendarApi: api }));
vi.mock('@/features/friends', () => ({
    listAllFriends: () =>
        Promise.resolve([
            {
                friendshipPublicId: 'f1',
                nickname: null,
                friendsSince: '',
                user: { publicId: 'U2', username: 'lea', firstName: 'Léa', name: 'Roth', profilePicture: null }
            },
            {
                friendshipPublicId: 'f2',
                nickname: 'Max',
                friendsSince: '',
                user: { publicId: 'U3', username: 'max', firstName: null, name: null, profilePicture: null }
            }
        ])
}));
vi.mock('@/features/auth/stores/auth-store', () => ({ useAuthStore: () => ({ user: { userPublicId: 'ME' } }) }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

import CalendarEventGuests from '@/features/calendar/components/forms/CalendarEventGuests.vue';

const AppSelectStub = {
    props: ['modelValue', 'items'],
    emits: ['update:modelValue'],
    template: `<select class="pick" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
        <option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option></select>`
};

function listOf(items: CalendarParticipantList['items']): CalendarParticipantList {
    const count = (s: string) => items.filter((p) => p.status === s).length;
    return { items, accepted: count('accepte'), declined: count('refuse'), maybe: count('peutEtre'), pending: count('invite') };
}

const lea = { userPublicId: 'U2', displayName: 'Léa Roth', role: 'participant', status: 'invite', message: null, respondedAt: null };

function mountGuests(isOrganizer: boolean) {
    return mount(CalendarEventGuests, {
        props: { eventPublicId: 'EVT', isOrganizer },
        global: { stubs: { AppSelect: AppSelectStub, AppAlert: { template: '<div class="alert"><slot /></div>' } } }
    });
}

describe('CalendarEventGuests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('invite un ami pas encore invité, puis le retire', async () => {
        api.participants.mockResolvedValueOnce(listOf([lea])).mockResolvedValueOnce(listOf([lea]));
        api.invite.mockResolvedValue(listOf([lea, { ...lea, userPublicId: 'U3', displayName: 'Max' }]));
        api.removeParticipant.mockResolvedValue(undefined);
        const wrapper = mountGuests(true);
        await flushPromises();

        // Léa est déjà invitée : seul Max est proposé.
        expect(wrapper.findAll('select.pick option').map((o) => o.text())).toEqual(['Max']);
        await wrapper.find('select.pick').setValue('U3');
        await wrapper.find('#cal-guests-message').setValue('  À samedi  ');
        await wrapper
            .findAll('button')
            .find((b) => b.text() === 'calendarPage.guests.invite')!
            .trigger('click');
        await flushPromises();
        expect(api.invite).toHaveBeenCalledWith('EVT', 'U3', '  À samedi  ');
        expect(wrapper.text()).toContain('Max');

        await wrapper
            .findAll('button')
            .find((b) => b.text() === 'calendarPage.guests.remove')!
            .trigger('click');
        await flushPromises();
        expect(api.removeParticipant).toHaveBeenCalledWith('EVT', 'U2');
    });

    it('laisse l’invité répondre et signale la réponse', async () => {
        api.participants.mockResolvedValue(listOf([{ ...lea, userPublicId: 'ME', displayName: 'Moi' }]));
        api.respond.mockResolvedValue(listOf([{ ...lea, userPublicId: 'ME', displayName: 'Moi', status: 'peutEtre' }]));
        const wrapper = mountGuests(false);
        await flushPromises();

        expect(wrapper.find('select.pick').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('calendarPage.guests.remove');
        await wrapper
            .findAll('button')
            .find((b) => b.text() === 'calendarPage.guests.answer.peutEtre')!
            .trigger('click');
        await flushPromises();
        expect(api.respond).toHaveBeenCalledWith('EVT', 'peutEtre');
        expect(wrapper.emitted('responded')).toHaveLength(1);
        expect(wrapper.find('[aria-pressed="true"]').text()).toBe('calendarPage.guests.answer.peutEtre');
    });
});
