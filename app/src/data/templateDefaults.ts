import { nanoid } from 'nanoid';
import type { PaletteField, SubmissionTemplate, TemplateSection } from '../types/templates';

// =============================================================================
// Field Palette — reusable measures an editor can drag into a section.
// Mirrors the volumetric measures used across PPS submission forms.
// =============================================================================
export const FIELD_PALETTE: PaletteField[] = [
  { id: 'pf-commercial',  name: 'Commercial',           dataType: 'Number', unit: 'kt' },
  { id: 'pf-construction', name: 'Construction',        dataType: 'Number', unit: 'kt' },
  { id: 'pf-industrial',  name: 'Industrial',            dataType: 'Number', unit: 'kt' },
  { id: 'pf-power',       name: 'Power & Desalination',  dataType: 'Number', unit: 'kt' },
  { id: 'pf-bunkering',   name: 'Bunkering',              dataType: 'Number', unit: 'kt' },
  { id: 'pf-aviation',    name: 'Aviation',               dataType: 'Number', unit: 'kt' },
  { id: 'pf-government',  name: 'Government',             dataType: 'Number', unit: 'kt' },
  { id: 'pf-road',        name: 'Road Transport',         dataType: 'Number', unit: 'kt' },
  { id: 'pf-rail',        name: 'Rail Transport',         dataType: 'Number', unit: 'kt' },
  { id: 'pf-marine',      name: 'Marine Transport',       dataType: 'Number', unit: 'kt' },
  { id: 'pf-total-supply', name: 'Total Supply',          dataType: 'Number', unit: 'kt' },
  { id: 'pf-total-demand', name: 'Total Demand',          dataType: 'Number', unit: 'kt' },
  { id: 'pf-local-prod',  name: 'Local Production',       dataType: 'Number', unit: 'kt' },
  { id: 'pf-imports',     name: 'Imports',                dataType: 'Number', unit: 'kt' },
  { id: 'pf-exports',     name: 'Exports',                dataType: 'Number', unit: 'kt' },
];

export const DATA_TYPES: { value: SubmissionTemplate['sections'][number]['fields'][number]['dataType']; label: string }[] = [
  { value: 'Text', label: 'Text' },
  { value: 'Number', label: 'Number' },
  { value: 'Date', label: 'Date' },
  { value: 'Year', label: 'Year' },
  { value: 'Dropdown', label: 'Dropdown' },
  { value: 'Email', label: 'Email' },
  { value: 'Phone', label: 'Phone' },
  { value: 'Textarea', label: 'Textarea' },
];

export const UNIT_OPTIONS = ['kt', 'litres', 'SCM', 'barrels', 'AED', '%', '—'];

function codeFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function field(name: string, opts: Partial<import('../types/templates').TemplateField> = {}) {
  return {
    id: nanoid(8),
    name,
    code: codeFromName(name),
    dataType: 'Text' as const,
    kind: 'Manual' as const,
    mandatory: false,
    readOnly: false,
    required: false,
    ...opts,
  };
}

// Default 7-section skeleton every new template starts from — General
// Information is pre-populated (mirrors every existing PPS submission form);
// the remaining sections are empty shells ready for fields to be dragged in.
export function defaultSections(): TemplateSection[] {
  return [
    {
      id: nanoid(8),
      title: '1. General Information',
      fields: [
        field('Submission Year', { dataType: 'Year', mandatory: true, required: true }),
        field('Company Name', { dataType: 'Text', mandatory: true, required: true }),
        field('Submission Date', { dataType: 'Date', mandatory: true, required: true }),
        field('Email', { dataType: 'Email' }),
        field('Phone Number', { dataType: 'Phone' }),
        field('Prepared By', { dataType: 'Text' }),
      ],
    },
    { id: nanoid(8), title: '2. Supply & Demand', fields: [] },
    { id: nanoid(8), title: '3. Imports', fields: [] },
    { id: nanoid(8), title: '4. Production', fields: [] },
    { id: nanoid(8), title: '5. Exports', fields: [] },
    { id: nanoid(8), title: '6. Stock Change', fields: [] },
    { id: nanoid(8), title: '7. Additional Information', fields: [] },
  ];
}

// =============================================================================
// Seed templates — 18 rows across 12 product/company families, matching the
// counts in the Template Management dashboard (Published / Draft / Archived).
// =============================================================================
function mkTemplate(overrides: Partial<SubmissionTemplate> & Pick<SubmissionTemplate, 'id' | 'familyId' | 'name' | 'code' | 'product' | 'company' | 'version' | 'status' | 'createdBy' | 'createdDate' | 'lastModified'>): SubmissionTemplate {
  return { sections: defaultSections(), ...overrides };
}

const day = (d: string) => new Date(d).toISOString();

export function seedTemplates(): SubmissionTemplate[] {
  return [
    mkTemplate({ id: 'TMP-0001', familyId: 'dsl-adnoc', name: 'Diesel - ADNOC Template', code: 'DSL-ADNOC', product: 'Diesel', company: 'ADNOC', version: 4, status: 'Published', createdBy: 'Ahmed Saeed', createdDate: day('2026-03-12'), lastModified: day('2026-07-19T11:42:00') }),
    mkTemplate({ id: 'TMP-0002', familyId: 'dsl-enoc', name: 'Diesel - ENOC Template', code: 'DSL-ENOC', product: 'Diesel', company: 'ENOC', version: 3, status: 'Draft', createdBy: 'Fatima Al Hashemi', createdDate: day('2026-03-10'), lastModified: day('2026-07-20T10:15:00') }),
    mkTemplate({ id: 'TMP-0003', familyId: 'dsl-grey', name: 'Diesel - Grey Market Template', code: 'DSL-GREY', product: 'Diesel', company: 'Grey Market', version: 2, status: 'Published', createdBy: 'Omar Al Suwaidi', createdDate: day('2026-03-08'), lastModified: day('2026-07-20T09:05:00') }),
    mkTemplate({ id: 'TMP-0004', familyId: 'gsl-adnoc', name: 'Gasoline - ADNOC Template', code: 'GSL-ADNOC', product: 'Gasoline', company: 'ADNOC', version: 6, status: 'Archived', createdBy: 'Sarah Al Dhaheri', createdDate: day('2026-03-05'), lastModified: day('2026-07-18T09:00:00') }),
    mkTemplate({ id: 'TMP-0004b', familyId: 'gsl-adnoc', name: 'Gasoline - ADNOC Template', code: 'GSL-ADNOC', product: 'Gasoline', company: 'ADNOC', version: 8, status: 'Published', createdBy: 'Sarah Al Dhaheri', createdDate: day('2026-06-01'), lastModified: day('2026-07-19T14:20:00') }),
    mkTemplate({ id: 'TMP-0005', familyId: 'gsl-enoc', name: 'Gasoline - ENOC Template', code: 'GSL-ENOC', product: 'Gasoline', company: 'ENOC', version: 1, status: 'Draft', createdBy: 'Mohamed Al Mansoori', createdDate: day('2026-03-04'), lastModified: day('2026-07-20T08:30:00') }),
    mkTemplate({ id: 'TMP-0006', familyId: 'ker-adnoc', name: 'Kerosene - ADNOC Template', code: 'KER-ADNOC', product: 'Kerosene', company: 'ADNOC', version: 2, status: 'Published', createdBy: 'Ahmed Saeed', createdDate: day('2026-02-28'), lastModified: day('2026-07-10T12:00:00') }),
    mkTemplate({ id: 'TMP-0007', familyId: 'ker-enoc', name: 'Kerosene - ENOC Template', code: 'KER-ENOC', product: 'Kerosene', company: 'ENOC', version: 1, status: 'Published', createdBy: 'Fatima Al Hashemi', createdDate: day('2026-02-25'), lastModified: day('2026-07-09T12:00:00') }),
    mkTemplate({ id: 'TMP-0008', familyId: 'lpg-adnoc', name: 'LPG - ADNOC Template', code: 'LPG-ADNOC', product: 'LPG', company: 'ADNOC', version: 3, status: 'Published', createdBy: 'Omar Al Suwaidi', createdDate: day('2026-02-20'), lastModified: day('2026-07-05T12:00:00') }),
    mkTemplate({ id: 'TMP-0009', familyId: 'lpg-enoc', name: 'LPG - ENOC Template', code: 'LPG-ENOC', product: 'LPG', company: 'ENOC', version: 2, status: 'Draft', createdBy: 'Sarah Al Dhaheri', createdDate: day('2026-02-18'), lastModified: day('2026-07-19T16:00:00') }),
    mkTemplate({ id: 'TMP-0010', familyId: 'jet-adnoc', name: 'Jet Fuel - ADNOC Template', code: 'JET-ADNOC', product: 'Jet Fuel', company: 'ADNOC', version: 1, status: 'Published', createdBy: 'Mohamed Al Mansoori', createdDate: day('2026-02-15'), lastModified: day('2026-06-28T12:00:00') }),
    mkTemplate({ id: 'TMP-0011', familyId: 'jet-enoc', name: 'Jet Fuel - ENOC Template', code: 'JET-ENOC', product: 'Jet Fuel', company: 'ENOC', version: 1, status: 'Published', createdBy: 'Ahmed Saeed', createdDate: day('2026-02-12'), lastModified: day('2026-06-27T12:00:00') }),
    mkTemplate({ id: 'TMP-0012', familyId: 'fo-adnoc', name: 'Fuel Oil - ADNOC Template', code: 'FO-ADNOC', product: 'Fuel Oil', company: 'ADNOC', version: 1, status: 'Published', createdBy: 'Fatima Al Hashemi', createdDate: day('2026-02-10'), lastModified: day('2026-06-20T12:00:00') }),
    mkTemplate({ id: 'TMP-0013', familyId: 'fo-enoc', name: 'Fuel Oil - ENOC Template', code: 'FO-ENOC', product: 'Fuel Oil', company: 'ENOC', version: 1, status: 'Archived', createdBy: 'Omar Al Suwaidi', createdDate: day('2026-01-15'), lastModified: day('2026-05-01T12:00:00') }),
    mkTemplate({ id: 'TMP-0014', familyId: 'naphtha-adnoc', name: 'Naphtha - ADNOC Template', code: 'NAP-ADNOC', product: 'Naphtha', company: 'ADNOC', version: 1, status: 'Published', createdBy: 'Sarah Al Dhaheri', createdDate: day('2026-01-10'), lastModified: day('2026-04-15T12:00:00') }),
    mkTemplate({ id: 'TMP-0015', familyId: 'bit-adnoc', name: 'Bitumen - ADNOC Template', code: 'BIT-ADNOC', product: 'Bitumen', company: 'ADNOC', version: 1, status: 'Published', createdBy: 'Mohamed Al Mansoori', createdDate: day('2026-01-08'), lastModified: day('2026-04-10T12:00:00') }),
    mkTemplate({ id: 'TMP-0016', familyId: 'bit-enoc', name: 'Bitumen - ENOC Template', code: 'BIT-ENOC', product: 'Bitumen', company: 'ENOC', version: 1, status: 'Published', createdBy: 'Ahmed Saeed', createdDate: day('2026-01-05'), lastModified: day('2026-04-05T12:00:00') }),
    mkTemplate({ id: 'TMP-0017', familyId: 'baseoil-adnoc', name: 'Base Oil - ADNOC Template', code: 'BO-ADNOC', product: 'Base Oil', company: 'ADNOC', version: 1, status: 'Draft', createdBy: 'Fatima Al Hashemi', createdDate: day('2026-07-14'), lastModified: day('2026-07-18T12:00:00') }),
  ];
}
