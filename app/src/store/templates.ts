import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { SubmissionTemplate, TemplateSection } from '../types/templates';
import { defaultSections, seedTemplates } from '../data/templateDefaults';

interface TemplatesState {
  templates: SubmissionTemplate[];

  // Create a brand-new template family: version 1, Draft, default sections.
  createTemplate: (input: { name: string; code: string; createdBy: string }) => SubmissionTemplate;

  // Start editing a template. If it's Published/Archived, this clones it into
  // a NEW row (same familyId, version + 1, status Draft) and returns that new
  // row's id — this is the "editing creates a new version record" behaviour.
  // If it's already a Draft, edits happen in place and the same id is returned.
  beginEdit: (id: string, editedBy: string) => string;

  // Persist section/name/code edits from the builder onto a row (Draft only).
  saveDraft: (id: string, patch: { name?: string; code?: string; sections?: TemplateSection[] }) => void;

  // Publish a draft row: marks it Published, archives any other row in the
  // same family that was previously Published.
  publishVersion: (id: string) => void;

  // Archive a row directly (unpublishes it — no longer assignable). This is
  // the only "removal" action available; there is no hard delete.
  archiveTemplate: (id: string) => void;

  duplicateTemplate: (id: string, createdBy: string) => SubmissionTemplate;

  getById: (id: string) => SubmissionTemplate | undefined;
  getFamily: (familyId: string) => SubmissionTemplate[];
}

export const useTemplates = create<TemplatesState>()(
  persist(
    (set, get) => ({
      templates: seedTemplates(),

      createTemplate: ({ name, code, createdBy }) => {
        const now = new Date().toISOString();
        const t: SubmissionTemplate = {
          id: `TMP-${nanoid(6).toUpperCase()}`,
          familyId: nanoid(8),
          name,
          code,
          product: '—',
          company: '—',
          version: 1,
          status: 'Draft',
          createdBy,
          createdDate: now,
          lastModified: now,
          sections: defaultSections(),
        };
        set((s) => ({ templates: [t, ...s.templates] }));
        return t;
      },

      beginEdit: (id, editedBy) => {
        const src = get().templates.find((t) => t.id === id);
        if (!src) return id;
        if (src.status === 'Draft') return id;

        const now = new Date().toISOString();
        const family = get().templates.filter((t) => t.familyId === src.familyId);
        const nextVersion = Math.max(...family.map((t) => t.version)) + 1;
        const clone: SubmissionTemplate = {
          ...src,
          id: `TMP-${nanoid(6).toUpperCase()}`,
          version: nextVersion,
          status: 'Draft',
          createdBy: editedBy,
          createdDate: now,
          lastModified: now,
          sections: src.sections.map((sec) => ({
            ...sec,
            id: nanoid(8),
            fields: sec.fields.map((f) => ({ ...f, id: nanoid(8) })),
          })),
        };
        set((s) => ({ templates: [clone, ...s.templates] }));
        return clone.id;
      },

      saveDraft: (id, patch) => {
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, ...patch, lastModified: new Date().toISOString() } : t,
          ),
        }));
      },

      publishVersion: (id) => {
        set((s) => {
          const target = s.templates.find((t) => t.id === id);
          if (!target) return s;
          const now = new Date().toISOString();
          return {
            templates: s.templates.map((t) => {
              if (t.id === id) return { ...t, status: 'Published', lastModified: now };
              // Every other version in the family — Draft, Published, or
              // already Archived — becomes Archived the moment a version is
              // published. This also means an Archived row can be selected
              // and published again directly (it just re-archives whatever
              // was Published before it).
              if (t.familyId === target.familyId) return { ...t, status: 'Archived', lastModified: now };
              return t;
            }),
          };
        });
      },

      duplicateTemplate: (id, createdBy) => {
        const src = get().templates.find((t) => t.id === id);
        const now = new Date().toISOString();
        const clone: SubmissionTemplate = src
          ? {
              ...src,
              id: `TMP-${nanoid(6).toUpperCase()}`,
              familyId: nanoid(8),
              name: `${src.name} (Copy)`,
              code: `${src.code}-COPY`,
              version: 1,
              status: 'Draft',
              createdBy,
              createdDate: now,
              lastModified: now,
              sections: src.sections.map((sec) => ({
                ...sec,
                id: nanoid(8),
                fields: sec.fields.map((f) => ({ ...f, id: nanoid(8) })),
              })),
            }
          : {
              id: `TMP-${nanoid(6).toUpperCase()}`,
              familyId: nanoid(8),
              name: 'Untitled Template',
              code: 'NEW-TEMPLATE',
              product: '—',
              company: '—',
              version: 1,
              status: 'Draft',
              createdBy,
              createdDate: now,
              lastModified: now,
              sections: defaultSections(),
            };
        set((s) => ({ templates: [clone, ...s.templates] }));
        return clone;
      },

      archiveTemplate: (id) => {
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, status: 'Archived', lastModified: new Date().toISOString() } : t,
          ),
        }));
      },

      getById: (id) => get().templates.find((t) => t.id === id),
      getFamily: (familyId) => get().templates.filter((t) => t.familyId === familyId).sort((a, b) => b.version - a.version),
    }),
    { name: 'doe.pps.admin.templates' },
  ),
);
