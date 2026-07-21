// =============================================================================
// Admin · Template Management — shared domain types
// =============================================================================

export type FieldDataType = 'Text' | 'Number' | 'Date' | 'Year' | 'Dropdown' | 'Email' | 'Phone' | 'Textarea';
export type FieldKind = 'Manual' | 'Calculated' | 'System';
export type TemplateStatus = 'Draft' | 'Published' | 'Archived';

export interface TemplateField {
  id: string;
  name: string;
  code: string;
  dataType: FieldDataType;
  unit?: string;
  kind: FieldKind;
  mandatory: boolean;
  readOnly: boolean;
  required: boolean;
  formulaExpression?: string;
  defaultValue?: string;
  helpText?: string;
}

export interface TemplateSection {
  id: string;
  title: string;
  fields: TemplateField[];
}

export interface SubmissionTemplate {
  id: string;          // e.g. TMP-0001 — unique per row/version
  familyId: string;     // groups all versions of the "same" template together
  name: string;
  code: string;
  product: string;
  company: string;
  version: number;
  status: TemplateStatus;
  createdBy: string;
  createdDate: string;   // ISO date
  lastModified: string;  // ISO datetime
  sections: TemplateSection[];
}

// Palette entry — a reusable field definition an editor can drag into a section.
export interface PaletteField {
  id: string;
  name: string;
  dataType: FieldDataType;
  unit?: string;
  company?: string;   // 'All Companies' filter tag
  product?: string;   // 'All Products' filter tag
}
