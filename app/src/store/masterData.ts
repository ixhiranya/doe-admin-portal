import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  MdProduct, MdCompany, MdUom, MdEntityType, MdRegion, MdSegment,
  MdEntityGroup, MdEntityGroupMember,
} from '@/types/masterData';
import {
  SEED_PRODUCTS, SEED_COMPANIES, SEED_UOM, SEED_ENTITY_TYPES,
  SEED_REGIONS, SEED_SEGMENTS, SEED_ENTITY_GROUPS, SEED_ENTITY_GROUP_MEMBERS,
} from '../services/masterdata/seedData';

// =============================================================================
// PPS · Master Data store — localStorage-backed, mirrors the pattern used by
// src/store/apps.ts (zustand + JSON in localStorage + nanoid ids). Mock
// service only, per the implementation brief — no backend calls.
// =============================================================================

const STORAGE_KEYS = {
  PRODUCTS: 'pps.md.products',
  COMPANIES: 'pps.md.companies',
  UOM: 'pps.md.uom',
  ENTITY_TYPES: 'pps.md.entityTypes',
  REGIONS: 'pps.md.regions',
  SEGMENTS: 'pps.md.segments',
  ENTITY_GROUPS: 'pps.md.entityGroups',
  ENTITY_GROUP_MEMBERS: 'pps.md.entityGroupMembers',
  VERSION: 'pps.md.version',
} as const;

// Bump when seed shape changes so returning users pick up new fields.
const SEED_VERSION = 'v2';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedIfNeeded() {
  const stale = localStorage.getItem(STORAGE_KEYS.VERSION) !== SEED_VERSION;
  if (stale || !localStorage.getItem(STORAGE_KEYS.PRODUCTS)) save(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
  if (stale || !localStorage.getItem(STORAGE_KEYS.COMPANIES)) save(STORAGE_KEYS.COMPANIES, SEED_COMPANIES);
  if (stale || !localStorage.getItem(STORAGE_KEYS.UOM)) save(STORAGE_KEYS.UOM, SEED_UOM);
  if (stale || !localStorage.getItem(STORAGE_KEYS.ENTITY_TYPES)) save(STORAGE_KEYS.ENTITY_TYPES, SEED_ENTITY_TYPES);
  if (stale || !localStorage.getItem(STORAGE_KEYS.REGIONS)) save(STORAGE_KEYS.REGIONS, SEED_REGIONS);
  if (stale || !localStorage.getItem(STORAGE_KEYS.SEGMENTS)) save(STORAGE_KEYS.SEGMENTS, SEED_SEGMENTS);
  if (stale || !localStorage.getItem(STORAGE_KEYS.ENTITY_GROUPS)) save(STORAGE_KEYS.ENTITY_GROUPS, SEED_ENTITY_GROUPS);
  if (stale || !localStorage.getItem(STORAGE_KEYS.ENTITY_GROUP_MEMBERS)) save(STORAGE_KEYS.ENTITY_GROUP_MEMBERS, SEED_ENTITY_GROUP_MEMBERS);
  localStorage.setItem(STORAGE_KEYS.VERSION, SEED_VERSION);
}
seedIfNeeded();

export interface MasterDataStore {
  products: MdProduct[];
  companies: MdCompany[];
  uoms: MdUom[];
  entityTypes: MdEntityType[];
  regions: MdRegion[];
  segments: MdSegment[];
  entityGroups: MdEntityGroup[];
  entityGroupMembers: MdEntityGroupMember[];

  refresh: () => void;
  resetToSeed: () => void;

  saveProduct: (p: Partial<MdProduct> & { id?: string }) => MdProduct;
  deleteProduct: (id: string) => { ok: boolean; error?: string };

  saveCompany: (c: Partial<MdCompany> & { id?: string }) => MdCompany;
  deleteCompany: (id: string) => { ok: boolean; error?: string };

  saveUom: (u: Partial<MdUom> & { id?: string }) => MdUom;
  deleteUom: (id: string) => { ok: boolean; error?: string };

  saveEntityType: (e: Partial<MdEntityType> & { id?: string }) => MdEntityType;
  deleteEntityType: (id: string) => { ok: boolean; error?: string };

  saveRegion: (r: Partial<MdRegion> & { id?: string }) => MdRegion;
  deleteRegion: (id: string) => { ok: boolean; error?: string };

  saveSegment: (s: Partial<MdSegment> & { id?: string }) => MdSegment;
  deleteSegment: (id: string) => { ok: boolean; error?: string };

  saveEntityGroup: (g: Partial<MdEntityGroup> & { id?: string }) => MdEntityGroup;
  deleteEntityGroup: (id: string) => { ok: boolean; error?: string };

  saveEntityGroupMember: (m: Partial<MdEntityGroupMember> & { id?: string }) => { ok: boolean; error?: string; row?: MdEntityGroupMember };
  deleteEntityGroupMember: (id: string) => { ok: boolean; error?: string };
}

function touch<T extends { createdAt: string; updatedAt: string }>(existing: T | undefined, patch: any, now: string): T {
  return { ...(existing as any), ...patch, createdAt: existing?.createdAt ?? now, updatedAt: now } as T;
}

export const useMasterData = create<MasterDataStore>((set, get) => ({
  products: load(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS),
  companies: load(STORAGE_KEYS.COMPANIES, SEED_COMPANIES),
  uoms: load(STORAGE_KEYS.UOM, SEED_UOM),
  entityTypes: load(STORAGE_KEYS.ENTITY_TYPES, SEED_ENTITY_TYPES),
  regions: load(STORAGE_KEYS.REGIONS, SEED_REGIONS),
  segments: load(STORAGE_KEYS.SEGMENTS, SEED_SEGMENTS),
  entityGroups: load(STORAGE_KEYS.ENTITY_GROUPS, SEED_ENTITY_GROUPS),
  entityGroupMembers: load(STORAGE_KEYS.ENTITY_GROUP_MEMBERS, SEED_ENTITY_GROUP_MEMBERS),

  refresh: () => set({
    products: load(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS),
    companies: load(STORAGE_KEYS.COMPANIES, SEED_COMPANIES),
    uoms: load(STORAGE_KEYS.UOM, SEED_UOM),
    entityTypes: load(STORAGE_KEYS.ENTITY_TYPES, SEED_ENTITY_TYPES),
    regions: load(STORAGE_KEYS.REGIONS, SEED_REGIONS),
    segments: load(STORAGE_KEYS.SEGMENTS, SEED_SEGMENTS),
    entityGroups: load(STORAGE_KEYS.ENTITY_GROUPS, SEED_ENTITY_GROUPS),
    entityGroupMembers: load(STORAGE_KEYS.ENTITY_GROUP_MEMBERS, SEED_ENTITY_GROUP_MEMBERS),
  }),

  resetToSeed: () => {
    save(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    save(STORAGE_KEYS.COMPANIES, SEED_COMPANIES);
    save(STORAGE_KEYS.UOM, SEED_UOM);
    save(STORAGE_KEYS.ENTITY_TYPES, SEED_ENTITY_TYPES);
    save(STORAGE_KEYS.REGIONS, SEED_REGIONS);
    save(STORAGE_KEYS.SEGMENTS, SEED_SEGMENTS);
    save(STORAGE_KEYS.ENTITY_GROUPS, SEED_ENTITY_GROUPS);
    save(STORAGE_KEYS.ENTITY_GROUP_MEMBERS, SEED_ENTITY_GROUP_MEMBERS);
    get().refresh();
  },

  // ── PRODUCT ──────────────────────────────────────────────────────────
  saveProduct: (p) => {
    const now = new Date().toISOString();
    const list = get().products;
    const existing = p.id ? list.find((x) => x.id === p.id) : undefined;
    const row = touch(existing, { ...p, id: p.id ?? `prod-${nanoid(8)}` }, now);
    const next = existing ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
    save(STORAGE_KEYS.PRODUCTS, next);
    set({ products: next });
    return row;
  },
  deleteProduct: (id) => {
    const inUseBy = get().companies; // products aren't referenced by companies directly, but keep symmetry
    void inUseBy;
    const next = get().products.filter((x) => x.id !== id);
    save(STORAGE_KEYS.PRODUCTS, next);
    set({ products: next });
    return { ok: true };
  },

  // ── COMPANY ──────────────────────────────────────────────────────────
  saveCompany: (c) => {
    const now = new Date().toISOString();
    const list = get().companies;
    const existing = c.id ? list.find((x) => x.id === c.id) : undefined;
    const row = touch(existing, { ...c, id: c.id ?? `co-${nanoid(8)}` }, now);
    const next = existing ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
    save(STORAGE_KEYS.COMPANIES, next);
    set({ companies: next });
    return row;
  },
  deleteCompany: (id) => {
    const childCount = get().companies.filter((x) => x.parentCompanyId === id).length;
    if (childCount > 0) return { ok: false, error: `Cannot delete — ${childCount} compan${childCount === 1 ? 'y' : 'ies'} still reference this as parent.` };
    const memberCount = get().entityGroupMembers.filter((m) => m.companyId === id).length;
    if (memberCount > 0) return { ok: false, error: `Cannot delete — company belongs to ${memberCount} Entity Group Member record(s). Remove those first.` };
    const next = get().companies.filter((x) => x.id !== id);
    save(STORAGE_KEYS.COMPANIES, next);
    set({ companies: next });
    return { ok: true };
  },

  // ── UOM ──────────────────────────────────────────────────────────────
  saveUom: (u) => {
    const now = new Date().toISOString();
    const list = get().uoms;
    const existing = u.id ? list.find((x) => x.id === u.id) : undefined;
    const row = touch(existing, { ...u, id: u.id ?? `uom-${nanoid(8)}` }, now);
    const next = existing ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
    save(STORAGE_KEYS.UOM, next);
    set({ uoms: next });
    return row;
  },
  deleteUom: (id) => {
    const usedByProduct = get().products.some((p) => p.defaultUomId === id);
    if (usedByProduct) return { ok: false, error: 'Cannot delete — this unit is set as the default UOM for one or more products.' };
    const usedAsBase = get().uoms.some((x) => x.baseUomId === id);
    if (usedAsBase) return { ok: false, error: 'Cannot delete — one or more units use this as their base unit.' };
    const next = get().uoms.filter((x) => x.id !== id);
    save(STORAGE_KEYS.UOM, next);
    set({ uoms: next });
    return { ok: true };
  },

  // ── ENTITY_TYPE ──────────────────────────────────────────────────────
  saveEntityType: (e) => {
    const now = new Date().toISOString();
    const list = get().entityTypes;
    const existing = e.id ? list.find((x) => x.id === e.id) : undefined;
    const row = touch(existing, { ...e, id: e.id ?? `etype-${nanoid(8)}` }, now);
    const next = existing ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
    save(STORAGE_KEYS.ENTITY_TYPES, next);
    set({ entityTypes: next });
    return row;
  },
  deleteEntityType: (id) => {
    const usedByCompany = get().companies.some((x) => x.entityTypeId === id);
    if (usedByCompany) return { ok: false, error: 'Cannot delete — one or more companies use this entity type.' };
    const next = get().entityTypes.filter((x) => x.id !== id);
    save(STORAGE_KEYS.ENTITY_TYPES, next);
    set({ entityTypes: next });
    return { ok: true };
  },

  // ── REGION ───────────────────────────────────────────────────────────
  saveRegion: (r) => {
    const now = new Date().toISOString();
    const list = get().regions;
    const existing = r.id ? list.find((x) => x.id === r.id) : undefined;
    const row = touch(existing, { ...r, id: r.id ?? `region-${nanoid(8)}` }, now);
    const next = existing ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
    save(STORAGE_KEYS.REGIONS, next);
    set({ regions: next });
    return row;
  },
  deleteRegion: (id) => {
    const childCount = get().regions.filter((x) => x.parentRegionId === id).length;
    if (childCount > 0) return { ok: false, error: `Cannot delete — ${childCount} region(s) still reference this as parent.` };
    const next = get().regions.filter((x) => x.id !== id);
    save(STORAGE_KEYS.REGIONS, next);
    set({ regions: next });
    return { ok: true };
  },

  // ── SEGMENT ──────────────────────────────────────────────────────────
  saveSegment: (s) => {
    const now = new Date().toISOString();
    const list = get().segments;
    const existing = s.id ? list.find((x) => x.id === s.id) : undefined;
    const row = touch(existing, { ...s, id: s.id ?? `seg-${nanoid(8)}` }, now);
    const next = existing ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
    save(STORAGE_KEYS.SEGMENTS, next);
    set({ segments: next });
    return row;
  },
  deleteSegment: (id) => {
    const next = get().segments.filter((x) => x.id !== id);
    save(STORAGE_KEYS.SEGMENTS, next);
    set({ segments: next });
    return { ok: true };
  },

  // ── ENTITY_GROUP ─────────────────────────────────────────────────────
  saveEntityGroup: (g) => {
    const now = new Date().toISOString();
    const list = get().entityGroups;
    const existing = g.id ? list.find((x) => x.id === g.id) : undefined;
    const row = touch(existing, { ...g, id: g.id ?? `grp-${nanoid(8)}` }, now);
    const next = existing ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
    save(STORAGE_KEYS.ENTITY_GROUPS, next);
    set({ entityGroups: next });
    return row;
  },
  deleteEntityGroup: (id) => {
    const memberCount = get().entityGroupMembers.filter((m) => m.groupId === id).length;
    if (memberCount > 0) return { ok: false, error: `Cannot delete — ${memberCount} member(s) still belong to this group. Remove them first.` };
    const next = get().entityGroups.filter((x) => x.id !== id);
    save(STORAGE_KEYS.ENTITY_GROUPS, next);
    set({ entityGroups: next });
    return { ok: true };
  },

  // ── ENTITY_GROUP_MEMBER ──────────────────────────────────────────────
  saveEntityGroupMember: (m) => {
    const now = new Date().toISOString();
    const list = get().entityGroupMembers;
    const existing = m.id ? list.find((x) => x.id === m.id) : undefined;
    const dup = list.some((x) => x.groupId === (m.groupId ?? existing?.groupId) && x.companyId === (m.companyId ?? existing?.companyId) && x.id !== m.id);
    if (dup) return { ok: false, error: 'This company is already a member of the selected group.' };
    const row: MdEntityGroupMember = { id: m.id ?? `egm-${nanoid(8)}`, groupId: m.groupId ?? existing!.groupId, companyId: m.companyId ?? existing!.companyId, createdAt: existing?.createdAt ?? now };
    const next = existing ? list.map((x) => (x.id === row.id ? row : x)) : [...list, row];
    save(STORAGE_KEYS.ENTITY_GROUP_MEMBERS, next);
    set({ entityGroupMembers: next });
    return { ok: true, row };
  },
  deleteEntityGroupMember: (id) => {
    const next = get().entityGroupMembers.filter((x) => x.id !== id);
    save(STORAGE_KEYS.ENTITY_GROUP_MEMBERS, next);
    set({ entityGroupMembers: next });
    return { ok: true };
  },
}));
