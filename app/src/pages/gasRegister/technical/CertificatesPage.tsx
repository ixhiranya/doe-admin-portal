import { useState } from 'react';
import { CERTS } from '../../../services/gasRegister/compliance';
import { TechnicalSectionLayout, FormField, Input } from './TechnicalSectionLayout';

export function CertificatesPage() {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const [shortLabel, setShortLabel] = useState('');
  const [source, setSource] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [validityYears, setValidityYears] = useState('');

  function submit() {
    alert(`Certificate "${label}" added.\nProduction would extend the live Compliance Rate formula automatically.`);
    setId(''); setLabel(''); setShortLabel(''); setSource(''); setWindowStart(''); setWindowEnd(''); setValidityYears('');
  }
  const canSubmit = !!id && !!label && !!shortLabel && !!source && !!windowStart && !!windowEnd && !!validityYears;

  return (
    <TechnicalSectionLayout
      title="Tracked Certificates"
      subtitle="Certificates that contribute to the live Compliance Rate computation per SDD §3.14. Adding a certificate here extends the formula's denominator automatically."
      sddRef="SDD §3.14.1"
      badge="TC"
      badgeCls="bg-emerald-50 text-emerald-700"
      iconBg="#10B981"
      kpis={[{ label: 'Total tracked certificates', value: CERTS.length }]}
      columns={[
        { id: 'short', label: 'Short', width: '120px' },
        { id: 'label', label: 'Label' },
        { id: 'source', label: 'Source System' },
        { id: 'window', label: 'Validity Window', width: '240px' },
        { id: 'years',  label: 'Years', align: 'right', width: '80px' },
      ]}
      rows={CERTS.map((c) => ({
        id: c.id,
        cells: [
          <span className="inline-flex items-center px-2 h-5 rounded font-mono font-bold text-[10px] bg-emerald-50 text-emerald-700">{c.shortLabel}</span>,
          <span className="text-ink-950 font-semibold">{c.label}</span>,
          <span className="text-neutral-600">{c.source}</span>,
          <span className="font-mono text-[11px] text-neutral-700">{c.expiryWindowStart} → {c.expiryWindowEnd}</span>,
          <span className="font-mono">{c.validityYears}y</span>,
        ],
      }))}
      createTitle="Add a Tracked Certificate"
      createDescription="Adds a new certificate slot to the Compliance Tracking module. The 4-cert validity formula will include it once configured per-category in the Categories section."
      canSubmit={canSubmit}
      onSubmit={submit}
      createForm={
        <>
          <FormField label="ID (system identifier)" required>
            <Input value={id} onChange={(v) => setId(v.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="adcdaPermit" mono />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Short Label" required>
              <Input value={shortLabel} onChange={setShortLabel} placeholder="ADCDA" mono />
            </FormField>
            <FormField label="Source System" required>
              <Input value={source} onChange={setSource} placeholder="ADCDA integration" />
            </FormField>
          </div>
          <FormField label="Display Label" required>
            <Input value={label} onChange={setLabel} placeholder="ADCDA Permit" />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Window Start" required>
              <Input type="date" value={windowStart} onChange={setWindowStart} />
            </FormField>
            <FormField label="Window End" required>
              <Input type="date" value={windowEnd} onChange={setWindowEnd} />
            </FormField>
            <FormField label="Validity (years)" required>
              <Input value={validityYears} onChange={(v) => setValidityYears(v.replace(/[^0-9]/g, ''))} placeholder="4" mono />
            </FormField>
          </div>
        </>
      }
    />
  );
}
