// src/data/formulaEntities.ts
// ============================================================================
// Catalog that powers the Visual Formula Builder:
//   - the "Self" entity  → fields that live on the application/record the
//     formula is being written for
//   - "Cross" entities   → fields on related entities the formula can reach
//     into (Company, Product, Facility/Asset, Inspection...)
//   - operators & return types shown in the builder's dropdowns
// This is deliberately static/mock data so the page works standalone; swap
// for a real metadata API later without touching the builder UI.
// ============================================================================

import type { FieldRef, FormulaReturnType } from '../types/formula';

export interface EntityDef {
  id: string;
  label: string;
  fields: { id: string; label: string; dataType: FieldRef['dataType'] }[];
}

// The entity a formula is always "attached to" — e.g. the Application/Service
// request record itself. Its fields need no entity prefix in the expression.
export const SELF_ENTITY: EntityDef = {
  id: 'application',
  label: 'Application (Self)',
  fields: [
    { id: 'feeAmount',        label: 'Fee Amount',            dataType: 'number' },
    { id: 'submissionDate',   label: 'Submission Date',       dataType: 'date' },
    { id: 'expiryDate',       label: 'Expiry Date',           dataType: 'date' },
    { id: 'daysOverdue',      label: 'Days Overdue',          dataType: 'number' },
    { id: 'violationCount',   label: 'Violation Count',       dataType: 'number' },
    { id: 'complianceScore',  label: 'Compliance Score',      dataType: 'number' },
    { id: 'renewalCount',     label: 'Renewal Count',         dataType: 'number' },
    { id: 'isCritical',       label: 'Is Critical Finding',   dataType: 'boolean' },
  ],
};

// Related entities a formula can cross into.
export const CROSS_ENTITIES: EntityDef[] = [
  {
    id: 'company',
    label: 'Company',
    fields: [
      { id: 'legalStatus',            label: 'Legal Status',              dataType: 'text' },
      { id: 'establishmentDate',      label: 'Establishment Date',        dataType: 'date' },
      { id: 'tradePermitExpiryDate',  label: 'Trade Permit Expiry Date',  dataType: 'date' },
      { id: 'riskRating',             label: 'Risk Rating',               dataType: 'number' },
    ],
  },
  {
    id: 'product',
    label: 'Product',
    fields: [
      { id: 'unitPrice',        label: 'Unit Price',        dataType: 'number' },
      { id: 'hazardClass',      label: 'Hazard Class',      dataType: 'text' },
      { id: 'storageCapacity',  label: 'Storage Capacity',  dataType: 'number' },
    ],
  },
  {
    id: 'facility',
    label: 'Facility / Asset',
    fields: [
      { id: 'capacity',       label: 'Capacity',        dataType: 'number' },
      { id: 'category',       label: 'Category',        dataType: 'text' },
      { id: 'lastAuditScore', label: 'Last Audit Score', dataType: 'number' },
    ],
  },
  {
    id: 'inspection',
    label: 'Inspection',
    fields: [
      { id: 'severityWeight', label: 'Severity Weight', dataType: 'number' },
      { id: 'findingCount',   label: 'Finding Count',   dataType: 'number' },
      { id: 'repeatOffence',  label: 'Repeat Offence',  dataType: 'boolean' },
    ],
  },
];

export const ALL_ENTITIES: EntityDef[] = [SELF_ENTITY, ...CROSS_ENTITIES];

export const OPERATORS: { value: string; label: string; group: 'arithmetic' | 'comparison' | 'logical' }[] = [
  { value: '+',   label: '+  Add',              group: 'arithmetic' },
  { value: '-',   label: '−  Subtract',         group: 'arithmetic' },
  { value: '*',   label: '×  Multiply',         group: 'arithmetic' },
  { value: '/',   label: '÷  Divide',           group: 'arithmetic' },
  { value: '==',  label: '=  Equals',           group: 'comparison' },
  { value: '!=',  label: '≠  Not equals',       group: 'comparison' },
  { value: '>',   label: '>  Greater than',     group: 'comparison' },
  { value: '<',   label: '<  Less than',        group: 'comparison' },
  { value: '>=',  label: '≥  Greater or equal',  group: 'comparison' },
  { value: '<=',  label: '≤  Less or equal',     group: 'comparison' },
  { value: 'AND', label: 'AND',                 group: 'logical' },
  { value: 'OR',  label: 'OR',                  group: 'logical' },
];

export const RETURN_TYPES: { value: FormulaReturnType; label: string }[] = [
  { value: 'number',     label: 'Number' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'currency',   label: 'Currency' },
  { value: 'boolean',    label: 'Boolean (Yes/No)' },
  { value: 'text',       label: 'Text' },
];

export function entityById(id: string): EntityDef | undefined {
  return ALL_ENTITIES.find((e) => e.id === id);
}
