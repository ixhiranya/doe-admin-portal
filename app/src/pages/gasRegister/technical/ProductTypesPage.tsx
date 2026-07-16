import { useState } from 'react';
import { PRODUCT_TYPES } from '../../../services/gasRegister/technical';
import { TechnicalSectionLayout, FormField, Input } from './TechnicalSectionLayout';

export function ProductTypesPage() {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');

  function submit() {
    alert(`Product Type "${label}" added.`);
    setId(''); setLabel('');
  }
  const canSubmit = !!id && !!label;

  return (
    <TechnicalSectionLayout
      title="Product Type"
      subtitle="Catalog used by Storage Methods, Inflow and Outflow flows. CNG decanting point was added per business feedback."
      sddRef="SDD §3.8.2"
      badge="PT"
      badgeCls="bg-blue-50 text-blue-700"
      iconBg="#3B82F6"
      kpis={[{ label: 'Total product types', value: PRODUCT_TYPES.length }]}
      columns={[
        { id: 'label',     label: 'Display Label' },
        { id: 'id',        label: 'ID', align: 'right', width: '200px' },
      ]}
      rows={PRODUCT_TYPES.map((p) => ({
        id: p.id,
        cells: [
          <span className="text-ink-950 font-semibold">{p.label}</span>,
          <span className="font-mono text-neutral-500">{p.id}</span>,
        ],
      }))}
      createTitle="Add a new Product Type"
      createDescription="Adds an entry to the central catalog. Pickable across Storage Methods, Inflow and Outflow forms."
      canSubmit={canSubmit}
      onSubmit={submit}
      createForm={
        <>
          <FormField label="ID (system identifier)" required helper="Lower-case slug with underscores.">
            <Input value={id} onChange={(v) => setId(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="bulk_lpg_tanker" mono />
          </FormField>
          <FormField label="Display Label" required>
            <Input value={label} onChange={setLabel} placeholder="Bulk LPG Tanker" />
          </FormField>
        </>
      }
    />
  );
}
