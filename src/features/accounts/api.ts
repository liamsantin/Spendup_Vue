import { fetchWrapper } from '@/utils/helpers/fetch-helpers';
import type {
    Account,
    AccountShare,
    AccountsListResult,
    AccountSharesListResult,
    CreateAccountPayload,
    IncomingAccountSharesResult,
    InviteAccountSharePayload,
    UpdateAccountPayload,
    UpdateAccountShareRolePayload
} from './types';

export const accountsApi = {
    list() {
        return fetchWrapper.get('/api/accounts') as Promise<AccountsListResult>;
    },

    get(publicId: string) {
        return fetchWrapper.get(`/api/accounts/${encodeURIComponent(publicId)}`) as Promise<Account>;
    },

    create(body: CreateAccountPayload) {
        return fetchWrapper.post('/api/accounts', body) as Promise<Account>;
    },

    update(publicId: string, body: UpdateAccountPayload) {
        return fetchWrapper.put(`/api/accounts/${encodeURIComponent(publicId)}`, body) as Promise<Account>;
    },

    setPrimary(publicId: string) {
        return fetchWrapper.post(`/api/accounts/${encodeURIComponent(publicId)}/primary`) as Promise<Account>;
    },

    archive(publicId: string) {
        return fetchWrapper.post(`/api/accounts/${encodeURIComponent(publicId)}/archive`) as Promise<Account>;
    },

    restore(publicId: string) {
        return fetchWrapper.post(`/api/accounts/${encodeURIComponent(publicId)}/restore`) as Promise<Account>;
    },

    remove(publicId: string) {
        return fetchWrapper.delete(`/api/accounts/${encodeURIComponent(publicId)}`) as Promise<void>;
    },

    listShares(accountPublicId: string) {
        return fetchWrapper.get(`/api/accounts/${encodeURIComponent(accountPublicId)}/shares`) as Promise<AccountSharesListResult>;
    },

    inviteShare(accountPublicId: string, body: InviteAccountSharePayload) {
        return fetchWrapper.post(`/api/accounts/${encodeURIComponent(accountPublicId)}/shares`, body) as Promise<AccountShare>;
    },

    updateShareRole(accountPublicId: string, userPublicId: string, body: UpdateAccountShareRolePayload) {
        return fetchWrapper.put(
            `/api/accounts/${encodeURIComponent(accountPublicId)}/shares/${encodeURIComponent(userPublicId)}`,
            body
        ) as Promise<AccountShare>;
    },

    revokeShare(accountPublicId: string, userPublicId: string) {
        return fetchWrapper.delete(
            `/api/accounts/${encodeURIComponent(accountPublicId)}/shares/${encodeURIComponent(userPublicId)}`
        ) as Promise<void>;
    },

    listIncomingShares() {
        return fetchWrapper.get('/api/accounts/shares/incoming') as Promise<IncomingAccountSharesResult>;
    },

    acceptShare(sharePublicId: string) {
        return fetchWrapper.post(`/api/accounts/shares/${encodeURIComponent(sharePublicId)}/accept`) as Promise<AccountShare>;
    },

    refuseShare(sharePublicId: string) {
        return fetchWrapper.post(`/api/accounts/shares/${encodeURIComponent(sharePublicId)}/refuse`) as Promise<void>;
    }
};
