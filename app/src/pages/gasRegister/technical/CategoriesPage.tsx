import { useState } from 'react';
import { CATEGORIES } from '../../../services/gasRegister/customers';
import { TechnicalSectionLayout, FormField, Input, Select, TextArea } from './TechnicalSectionLayout';

export function CategoriesPage() {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const [identification, setIdentification] = useState<'eid' | 'cn-mc'>('cn-mc');
  const [buildingTypes, setBuildingTypes] = useState('');

  function submit() {
    alert(`Category "${label}" added with ${buildingTypes.split(';').filter(Boolean).length} building types.`);
    setId(''); setLabel(''); setIdentification('cn-mc'); setBuildingTypes('');
  }
  const canSubmit = !!id && !!label && !!buildingTypes.trim();

  return (
    <TechnicalSectionLayout
      title="Customer Categories"
      subtitle="The 10 SDD-defined categories that drive the dynamic customer form. The identification rule (EID vs CN/MC) is configured per category."
      sddRef="SDD §3.1.1"
      badge="CT"
      badgeCls="bg-violet-50 text-violet-700"
      iconBg="#7B3FE4"
      kpis={[
        { label: 'Total categories', value: CATEGORIES.length },
        { label: 'EID-flow',         value: CATEGORIES.filter((c) => c.identification === 'eid').length,   tone: 'info' },
        { label: 'CN/MC-flow',       value: CATEGORIES.filter((c) => c.identification === 'cn-mc').length, tone: 'warning' },
      ]}
      columns={[
        { id: 'label',   label: 'Category', width: '200px' },
        { id: 'flow',    label: 'Identification', width: '140px' },
        { id: 'count',   label: 'Building Types', align: 'right', width: '120px' },
        { id: 'sample',  label: 'Sample types' },
      ]}
      rows={CATEGORIES.map((c) => ({
        id: c.id,
        cells: [
          <span className="text-ink-950 font-semibold">{c.label}</span>,
          <span className={'inline-flex items-center px-2 h-5 rounded font-mono font-bold text-[9.5px] tracking-wider ' +
            (c.identification === 'eid' ? 'bg-info-soft text-info-500' : 'bg-action-orange-soft text-action-orange-deep')}>
            {c.identification === 'eid' ? 'EID' : 'CN/MC'}
          </span>,
          <span className="font-mono">{c.buildingTypes.length}</span>,
          <span className="text-[11px] text-neutral-600 line-clamp-2">
            {c.buildingTypes.slice(0, 4).join(' · ')}
            {c.buildingTypes.length > 4 && ` · +${c.buildingTypes.length - 4} more`}
          </span>,
        ],
      }))}
      createTitle="Add a Customer Category"
      createDescription="Adds a new category to the customer form's Category dropdown. Building Types are configured per category."
      canSubmit={canSubmit}
      onSubmit={submit}
      createForm={
        <>
          <FormField label="ID (system identifier)" required>
            <Input value={id} onChange={(v) => setId(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="healthcare" mono />
          </FormField>
          <FormField label="Display Label" required>
            <Input value={label} onChange={setLabel} placeholder="Healthcare" />
          </FormField>
          <FormField label="Identification Flow" required helper="EID flow applies to Residential / Villas Palaces; everything else uses CN/MC.">
            <Select value={identification} onChange={(v) => setIdentification(v as any)} options={[
              { value: 'cn-mc', label: 'CN / MC (Trade Licence)' },
              { value: 'eid',   label: 'EID (Emirates ID)' },
            ]} />
          </FormField>
          <FormField label="Building Types" required helper="One per line OR separated by semicolons.">
            <TextArea value={buildingTypes} onChange={setBuildingTypes} rows={4}
              placeholder="Hospitals; Clinics; Diagnostic centres; Pharmacies; Laboratories" />
          </FormField>
        </>
      }
    />
  );
}
