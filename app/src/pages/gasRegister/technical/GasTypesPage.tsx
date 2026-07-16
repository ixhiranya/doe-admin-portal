import { useState } from 'react';
import { GAS_TYPES } from '../../../services/gasRegister/technical';
import { TechnicalSectionLayout, FormField, Input, Select } from './TechnicalSectionLayout';

export function GasTypesPage() {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const [shortLabel, setShortLabel] = useState('');
  const [state, setState] = useState<'gas' | 'liquefied'>('gas');
  const [litresPerScm, setLitresPerScm] = useState('');

  function submit() {
    alert(`Type of Gas "${label}" added.\nProduction: persists to central Technical Master Data store.`);
    setId(''); setLabel(''); setShortLabel(''); setState('gas'); setLitresPerScm('');
  }

  const canSubmit = !!id && !!label && !!shortLabel && !!litresPerScm;

  return (
    <TechnicalSectionLayout
      title="Type of Gas"
      subtitle="Catalog of all gas types selectable across the platform. NG and CNG were added per business feedback in addition to chemistry-based values."
      sddRef="SDD §3.8.1"
      badge="GT"
      badgeCls="bg-action-orange-soft text-action-orange-deep"
      iconBg="#E89B4C"
      kpis={[
        { label: 'Total gas types', value: GAS_TYPES.length },
        { label: 'Gaseous',         value: GAS_TYPES.filter((g) => g.state === 'gas').length,       tone: 'info' },
        { label: 'Liquefied',       value: GAS_TYPES.filter((g) => g.state === 'liquefied').length, tone: 'warning' },
      ]}
      columns={[
        { id: 'short',     label: 'Short', width: '90px' },
        { id: 'label',     label: 'Label' },
        { id: 'state',     label: 'State', width: '120px' },
        { id: 'conv',      label: '1 SCM = X L', align: 'right', width: '140px' },
        { id: 'id',        label: 'ID', align: 'right', width: '120px' },
      ]}
      rows={GAS_TYPES.map((g) => ({
        id: g.id,
        cells: [
          <span className="inline-flex items-center px-2 h-5 rounded font-mono font-bold text-[10px] bg-action-orange-soft text-action-orange-deep">{g.shortLabel}</span>,
          <span className="text-ink-950">{g.label}</span>,
          <span className={g.state === 'gas' ? 'text-blue-700' : 'text-amber-700'}>{g.state}</span>,
          <span className="font-mono">{g.litresPerScm}</span>,
          <span className="font-mono text-neutral-500">{g.id}</span>,
        ],
      }))}
      createTitle="Add a new Type of Gas"
      createDescription="Adds an entry to the central catalog. The L↔SCM conversion factor is applied wherever this gas type is displayed."
      canSubmit={canSubmit}
      onSubmit={submit}
      createForm={
        <>
          <FormField label="ID (system identifier)" required helper="Lower-case slug · used by the data layer.">
            <Input value={id} onChange={(v) => setId(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="hydrogen" mono />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Short Label" required>
              <Input value={shortLabel} onChange={setShortLabel} placeholder="HYDROGEN" mono />
            </FormField>
            <FormField label="State" required>
              <Select value={state} onChange={(v) => setState(v as any)} options={[
                { value: 'gas', label: 'Gaseous (NG / CNG)' },
                { value: 'liquefied', label: 'Liquefied (LPG / Propane / Butane)' },
              ]} />
            </FormField>
          </div>
          <FormField label="Display Label" required helper="The full name shown across dropdowns and tables.">
            <Input value={label} onChange={setLabel} placeholder="Hydrogen (Compressed) / Liquefied Gases" />
          </FormField>
          <FormField label="Conversion Factor — 1 SCM = N Litres" required helper="Used by formatVolumeDual() to display both units throughout the platform.">
            <Input value={litresPerScm} onChange={(v) => setLitresPerScm(v.replace(/[^0-9.]/g, ''))} placeholder="4.07" mono />
          </FormField>
        </>
      }
    />
  );
}
