import { PPS_PRODUCTS, PRODUCT_ENTITIES, getProduct } from "./pps";
import type {
  PpsCompany,
  PpsTemplate,
  CompanyConfiguration,
} from "../types/ppsConfig";

// ============================================================================
// Mock master data for the Configuration module (Admin Modules → Configuration).
// This module does not create Companies, Products or Templates — it only
// configures the mapping between them. All three lists below are prototype
// stand-ins for what would come from COMPANY / PRODUCT / FORM_TEMPLATE in the
// real system (see Data Design doc §2, §12).
// ============================================================================

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Best-effort entity type per BRD §16 Entity-to-Product Mapping — display only.
const ENTITY_TYPE_OVERRIDES: Record<string, string> = {
  ADNOC: "Producer",
  "ADNOC Gas": "Producer",
  "Dolphin Energy": "Producer",
  Petrochem: "Producer",
  "Neutral Fuels": "Producer",
  "Integrated Biofuels": "Producer",
  "BioD Technology": "Producer",
  "Blue Biofuels": "Producer",
  "Abu Dhabi Ports": "Consumer",
  EGA: "Consumer",
  EWEC: "Consumer",
  "Emirates Steel": "Consumer",
  "Al Ain Cement": "Consumer",
  "Eco Hub": "Consumer",
  Chemstock: "Importer",
  "Al Nahda International": "Importer",
  "Direct Importers (3 companies)": "Importer",
  "Grey Market (25+ resellers)": "Distributor",
};

// ----- COMPANY master (derived from the existing PRODUCT_ENTITIES map so ids
// stay consistent with what the rest of the app already uses) -----------------
const uniqueCompanyNames = Array.from(
  new Set(Object.values(PRODUCT_ENTITIES).flat()),
).sort((a, b) => a.localeCompare(b));

export const ALL_COMPANIES: PpsCompany[] = uniqueCompanyNames.map((name) => ({
  id: slugify(name),
  name,
  entityType: ENTITY_TYPE_OVERRIDES[name] ?? "Distributor",
  isAggregate: /\(.*resellers|\(.*compan/i.test(name),
}));

export function getCompany(id: string): PpsCompany | undefined {
  return ALL_COMPANIES.find((c) => c.id === id);
}

// ----- PRODUCT catalogue — Step 2 offers the full 12-product catalogue, not
// just the products a company already appears against in the static BRD
// mapping, since this screen is what defines that relationship going forward.
export const CONFIGURABLE_PRODUCTS = PPS_PRODUCTS;

// ----- TEMPLATE catalogue (mirrors FORM_TEMPLATE — already created elsewhere;
// one template per known product–company combination, matching the naming
// convention in the Data Design doc: code "diesel_adnoc", name "Diesel —
// ADNOC Distribution", plus the short form named in the BRD-style example
// "Diesel ADNOC Submission Form"). --------------------------------------------
function shortCompanyTag(name: string): string {
  return name
    .replace(" Distribution", "")
    .replace(" (25+ resellers)", "")
    .replace(" (3 companies)", "")
    .split(" ")
    .slice(0, 2)
    .join(" ");
}

export const TEMPLATES: PpsTemplate[] = Object.entries(
  PRODUCT_ENTITIES,
).flatMap(([productId, companies], pi) =>
  companies.map((companyName, ci) => {
    const product = getProduct(productId);
    const tag = shortCompanyTag(companyName);
    return {
      id: `tpl-${productId}-${slugify(companyName)}`,
      code: `${productId}_${slugify(companyName)}`,
      name: `${product?.label ?? productId} — ${tag} Submission Form`,
      productId,
      version: 1 + ((pi + ci) % 3),
      isActive: true,
    } satisfies PpsTemplate;
  }),
);

/** Active templates available for a given product (what Step 3's dropdown offers). */
export function templatesForProduct(productId: string): PpsTemplate[] {
  return TEMPLATES.filter((t) => t.productId === productId && t.isActive);
}

/** Best-guess default template for a company on a product — matched by name, not auto-saved. */
export function suggestedTemplateId(
  productId: string,
  companyId: string,
): string | null {
  const company = getCompany(companyId);
  if (!company) return null;
  const match = TEMPLATES.find(
    (t) =>
      t.productId === productId &&
      t.code === `${productId}_${slugify(company.name)}`,
  );
  return match?.id ?? null;
}

/** Products a company already appears against in the BRD §16 mapping — used only
 *  to pre-suggest a starting point in Step 2, never to restrict the catalogue. */
export function suggestedProductIdsForCompany(companyId: string): string[] {
  const company = getCompany(companyId);
  if (!company) return [];
  return Object.entries(PRODUCT_ENTITIES)
    .filter(([, names]) => names.includes(company.name))
    .map(([productId]) => productId);
}

// ----- Seed configurations — a couple of companies already configured, so the
// Configuration Home list has something to show on first load. -------------
function seedFor(
  companyId: string,
  updatedAt: string,
  dropLastTemplate = false,
): CompanyConfiguration {
  const productIds = suggestedProductIdsForCompany(companyId);
  return {
    companyId,
    productIds,
    assignments: productIds.map((pid, i) => ({
      productId: pid,
      templateId:
        dropLastTemplate && i === productIds.length - 1
          ? null
          : suggestedTemplateId(pid, companyId),
    })),
    updatedAt,
    updatedBy: "Omar Al Suwaidi",
  };
}

export const SEED_CONFIGURATIONS: CompanyConfiguration[] = [
  seedFor("adnoc-distribution", "2026-06-18T09:20:00Z"),
  // Left one product un-templated on purpose to demonstrate the "Incomplete" state.
  seedFor("adnoc", "2026-06-15T13:05:00Z", true),
];
