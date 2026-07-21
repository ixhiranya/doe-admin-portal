// src/types/formula.ts
// ============================================================================
// Types for the Formula Configuration admin module — lets an admin define
// reusable calculation formulas (used across Compliance & PPS) via a visual,
// token-based expression builder instead of hand-typed code.
// ============================================================================

export type FormulaReturnType = 'number' | 'percentage' | 'currency' | 'boolean' | 'text';

export type FormulaStatus = 'active' | 'inactive' | 'draft';

// A single field pickable in the builder. `scope` tells you whether it came
// off the formula's own (self) entity, or a related (cross) entity.
export interface FieldRef {
  entityId: string;      // e.g. 'application', 'company', 'product'
  entityLabel: string;   // e.g. 'Application', 'Company', 'Product'
  fieldId: string;       // e.g. 'feeAmount'
  fieldLabel: string;    // e.g. 'Fee Amount'
  dataType: 'number' | 'text' | 'date' | 'boolean';
}

// One "piece" of the expression, in the order the user built it.
export type FormulaToken =
  | { id: string; kind: 'field'; scope: 'self' | 'cross'; field: FieldRef }
  | { id: string; kind: 'operator'; value: string; label: string }
  | { id: string; kind: 'number'; value: string }
  | { id: string; kind: 'paren'; value: '(' | ')' };

export interface Formula {
  id: string;
  name: string;
  code: string;                 // system identifier, e.g. FML_LATE_FEE_PCT
  description?: string;
  returnType: FormulaReturnType;
  tokens: FormulaToken[];
  expression: string;           // human-readable rendering of tokens, cached
  dependencies: string[];       // distinct cross-entity labels referenced
  status: FormulaStatus;
  updatedAt: string;            // ISO date string
}
