// src/types/formula.ts
// ============================================================================
// Types for the Formula Configuration admin module.
// ============================================================================

export type FormulaStatus = 'active' | 'draft';

// A field the builder inserted into the expression.
export interface FieldRef {
  fieldId: string;         // e.g. 'imports'
  fieldLabel: string;      // e.g. 'Imports'
  entityLabel?: string;    // set only for Cross fields, e.g. 'Grey Market'
}

export type FormulaToken =
  | { id: string; kind: 'field'; scope: 'self' | 'cross'; field: FieldRef }
  | { id: string; kind: 'operator'; value: string; label: string }
  | { id: string; kind: 'number'; value: string };

export interface Formula {
  id: string;             // internal key
  formulaId: string;       // display id, e.g. 'FML-1001'
  name: string;
  code: string;             // e.g. FML_LATE_RENEWAL_PCT
  description?: string;
  templateId: string;        // base template this formula is built against
  returnType: string;         // unit value, e.g. 'kt' — see RETURN_TYPES
  tokens: FormulaToken[];
  expression: string;          // cached human-readable rendering of tokens
  type: 'self' | 'cross';       // auto-derived from tokens
  status: FormulaStatus;
  enabled: boolean;              // Actions toggle — off = soft-deleted
  updatedAt: string;
}
