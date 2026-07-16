import { useState } from 'react';
import { UNITS } from '../../../services/gasRegister/technical';
import { TechnicalSectionLayout, FormField, Input, TextArea } from './TechnicalSectionLayout';

export function UnitsPage() {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  function submit() {
    alert(`Unit "${label}" added.`);
    setId(''); setLabel(''); setDescription('');
  }
  const canSubmit = !!id && !!label && !!description;

  return (
    <TechnicalSectionLayout
      title="Unit of Measurement"
      subtitle="Volumetric units used across the Gas Register. The default display shows Litres with the SCM equivalent in parallel per SDD §3.8.3."
      sddRef="SDD §3.8.3"
      badge="UM"
      badgeCls="bg-amber-50 text-amber-700"
      iconBg="#F59E0B"
      kpis={[{ label: 'Total units', value: UNITS.length }]}
      columns={[
        { id: 'code',  label: 'Code', width: '100px' },
        { id: 'label', label: 'Label', width: '240px' },
        { id: 'desc',  label: 'Description' },
      ]}
      rows={UNITS.map((u) => ({
        id: u.id,
        cells: [
          <span className="inline-flex items-center px-2 h-5 rounded font-mono font-bold text-[10px] bg-blue-50 text-blue-700">{u.id}</span>,
          <span className="text-ink-950 font-semibold">{u.label}</span>,
          <span className="text-neutral-600">{u.description}</span>,
        ],
      }))}
      createTitle="Add a new Unit of Measurement"
      createDescription="Adds a unit to the central catalog. Conversion factors are configured per gas type (see Gas Types section)."
      canSubmit={canSubmit}
      onSubmit={submit}
      createForm={
        <>
          <FormField label="Code" required helper="Short, uppercase code used in tables and chip labels.">
            <Input value={id} onChange={(v) => setId(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="KG" mono />
          </FormField>
          <FormField label="Label" required>
            <Input value={label} onChange={setLabel} placeholder="Kilograms" />
          </FormField>
          <FormField label="Description" required>
            <TextArea value={description} onChange={setDescription} placeholder="Use case for this unit across the platform." />
          </FormField>
        </>
      }
    />
  );
}
