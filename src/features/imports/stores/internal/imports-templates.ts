import { AppError } from '@/utils/errors/app-error';
import { importTemplatesApi, importsApi } from '@/features/imports/api';
import type { ImportTemplate, SaveImportAsTemplatePayload, UpdateImportTemplatePayload } from '@/features/imports/types';
import type { ImportsState } from '@/features/imports/stores/internal/imports-state';

export const IMPORT_TEMPLATE_NOT_FOUND_MESSAGE = 'Ce modèle n’est plus disponible.';

/** Modèles d’import : perso (actifs + inactifs) puis système (lecture seule). */
export function createImportsTemplates(state: ImportsState) {
    const { templates, templatesLoading, templatesLoaded, error, beginActing, endActing, clearError, rememberLocalMutation } = state;

    let requestSeq = 0;

    /** Liste complète (tous types) : le filtrage par `sourceType` se fait localement. */
    async function loadTemplates(options: { force?: boolean } = {}) {
        if (templatesLoaded.value && !options.force) return;
        const requestId = ++requestSeq;
        templatesLoading.value = true;
        try {
            const result = await importTemplatesApi.list();
            if (requestId !== requestSeq) return;
            templates.value = Array.isArray(result?.items) ? result.items : [];
            templatesLoaded.value = true;
        } catch (e: unknown) {
            if (requestId === requestSeq) error.value = AppError.fromUnknown(e).message;
            throw e;
        } finally {
            if (requestId === requestSeq) templatesLoading.value = false;
        }
    }

    async function refetchTemplates() {
        if (!templatesLoaded.value) return;
        await loadTemplates({ force: true }).catch(() => undefined);
    }

    /** Perso en tête (ordre API conservé), système ensuite. */
    function upsertTemplate(template: ImportTemplate) {
        const index = templates.value.findIndex((item) => item.publicId === template.publicId);
        if (index >= 0) {
            const copy = [...templates.value];
            copy[index] = template;
            templates.value = copy;
            return;
        }
        const firstSystem = templates.value.findIndex((item) => item.isSystem);
        const copy = [...templates.value];
        copy.splice(firstSystem < 0 ? copy.length : firstSystem, 0, template);
        templates.value = copy;
    }

    function removeTemplateLocal(publicId: string) {
        templates.value = templates.value.filter((item) => item.publicId !== publicId);
    }

    async function run<T>(templatePublicId: string | null, action: () => Promise<T>): Promise<T> {
        beginActing();
        clearError();
        if (templatePublicId) rememberLocalMutation(templatePublicId);
        try {
            return await action();
        } catch (e: unknown) {
            const err = AppError.fromUnknown(e);
            if (err.status === 404 && templatePublicId) {
                removeTemplateLocal(templatePublicId);
                error.value = IMPORT_TEMPLATE_NOT_FOUND_MESSAGE;
            } else {
                error.value = err.message;
            }
            throw err;
        } finally {
            endActing();
        }
    }

    /** Crée un modèle perso à partir du mapping retenu de l’import. */
    async function saveImportAsTemplate(importPublicId: string, body: SaveImportAsTemplatePayload) {
        return run(null, async () => {
            const created = await importsApi.saveAsTemplate(importPublicId, body);
            rememberLocalMutation(created.publicId);
            if (templatesLoaded.value) upsertTemplate(created);
            return created;
        });
    }

    /** PUT état complet : le mapping existant est renvoyé tel quel. */
    async function updateTemplate(template: ImportTemplate, patch: Partial<Omit<UpdateImportTemplatePayload, 'mapping'>>) {
        return run(template.publicId, async () => {
            const updated = await importTemplatesApi.update(template.publicId, {
                name: patch.name ?? template.name,
                mapping: template.mapping,
                bankTierPublicId: patch.bankTierPublicId !== undefined ? patch.bankTierPublicId : template.bankTierPublicId,
                isActive: patch.isActive ?? template.isActive
            });
            upsertTemplate(updated);
            return updated;
        });
    }

    async function deleteTemplate(publicId: string) {
        return run(publicId, async () => {
            await importTemplatesApi.remove(publicId);
            removeTemplateLocal(publicId);
        });
    }

    function cancelPendingTemplates() {
        requestSeq += 1;
        templatesLoading.value = false;
    }

    return {
        loadTemplates,
        refetchTemplates,
        saveImportAsTemplate,
        updateTemplate,
        deleteTemplate,
        removeTemplateLocal,
        cancelPendingTemplates
    };
}

export type ImportsTemplates = ReturnType<typeof createImportsTemplates>;
