// ============================================================================
// PPS Configuration module — types for the Company ↔ Product ↔ Template
// mapping screen (Admin Modules → Configuration).
//
// Mirrors the real data model described in the Data Design doc:
//   COMPANY ||--o{ COMPANY_PRODUCT : "submits"
//   PRODUCT ||--o{ COMPANY_PRODUCT : "submitted as"
//   FORM_TEMPLATE ||--o{ COMPANY_PRODUCT : "used by"
// FORM_TEMPLATE rows already exist (created elsewhere by the Internal Team);
// this module only assigns them. COMPANY_PRODUCT is the row this module
// writes: one per company, per product, holding exactly one template_id.
// ============================================================================

export interface PpsCompany {
  id: string;
  name: string;
  /** Best-effort role tag for display only — Producer / Distributor / Importer / Consumer / Aggregate. */
  entityType: string;
  /** True for bucket rows that stand in for many small companies (e.g. Grey Market). */
  isAggregate?: boolean;
}

/** Mirrors FORM_TEMPLATE — already created elsewhere; this module never creates or edits these. */
export interface PpsTemplate {
  id: string;
  code: string; // e.g. 'diesel_adnoc'
  name: string; // e.g. 'Diesel — ADNOC Distribution Submission Form'
  productId: string;
  version: number;
  isActive: boolean;
}

/** Mirrors COMPANY_PRODUCT — one row per product assigned to a company, with exactly one template. */
export interface ProductTemplateAssignment {
  productId: string;
  templateId: string | null; // null until the user assigns one in Step 3
}

/** One saved Company configuration (the unit of work this screen manages). */
export interface CompanyConfiguration {
  companyId: string;
  productIds: string[]; // Step 2 output — Company → Product links
  assignments: ProductTemplateAssignment[]; // Step 3 output — one per productId
  updatedAt: string; // ISO timestamp
  updatedBy: string; // display name of the internal user
}

/** A configuration can be saved only once every selected Product has a Template. */
export function isConfigurationComplete(config: CompanyConfiguration): boolean {
  if (config.productIds.length === 0) return false;
  return config.productIds.every(
    (pid) => config.assignments.find((a) => a.productId === pid)?.templateId,
  );
}
